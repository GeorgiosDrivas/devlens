const path = require("path");
const {
  findFirstExistingPath,
  walk,
  normalizeSlashes,
  toRelative,
  fsp,
  root,
  uniqueSorted,
  hasAnyDependency,
} = require("./utils");
const { JS_EXTS, IGNORED_DIRS, IGNORED_PATH_SEGMENTS } = require("./constants");

function extractExpressRoutes(text) {
  const routes = [];
  const patterns = [
    /\b(?:app|router)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /\b(?:app|router)\.use\s*\(\s*['"`]([^'"`]+)['"`]/gi,
  ];

  let match;

  while ((match = patterns[0].exec(text)) !== null) {
    routes.push({
      path: match[2],
      methods: [match[1].toUpperCase()],
    });
  }

  while ((match = patterns[1].exec(text)) !== null) {
    routes.push({
      path: match[1],
      methods: ["USE"],
    });
  }

  return routes;
}

function findApiClientEvidence(text, relativeFile) {
  const hits = [];

  if (/\baxios\.create\s*\(/.test(text) || /\baxios\./.test(text)) {
    hits.push(relativeFile);
  }

  if (/\bfetch\s*\(/.test(text)) {
    hits.push(relativeFile);
  }

  if (/\bbaseURL\b/.test(text) || /\bbaseUrl\b/.test(text)) {
    hits.push(relativeFile);
  }

  if (/\/api\/[A-Za-z0-9/_-]*/.test(text)) {
    hits.push(relativeFile);
  }

  return hits;
}

async function scanNextApiRoutes() {
  const apiRoutes = [];

  const appDir = await findFirstExistingPath([
    path.join(root, "app"),
    path.join(root, "src", "app"),
  ]);

  const pagesDir = await findFirstExistingPath([
    path.join(root, "pages"),
    path.join(root, "src", "pages"),
  ]);

  if (appDir) {
    const appFiles = await walk(
      appDir,
      IGNORED_DIRS,
      IGNORED_PATH_SEGMENTS,
      (file) => JS_EXTS.has(path.extname(file).toLowerCase()),
    );

    for (const file of appFiles) {
      const relative = normalizeSlashes(path.relative(appDir, file));
      if (!relative.startsWith("api/")) continue;

      const noExt = relative.replace(/\.[^.]+$/, "");
      if (!(noExt === "api/route" || noExt.endsWith("/route"))) continue;

      const routeBase = noExt.replace(/^api/, "").replace(/\/route$/, "");
      const route = `/api${routeBase}`.replace(/\/+/g, "/");

      const text = await fsp.readFile(file, "utf8");
      const methods = new Set();
      const exportPattern =
        /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/gi;

      let match;
      while ((match = exportPattern.exec(text)) !== null) {
        const method = match[1] || match[2];
        if (method) methods.add(method.toUpperCase());
      }

      apiRoutes.push({
        path: route,
        file: toRelative(file),
        methods:
          methods.size > 0 ? Array.from(methods).sort() : ["GET", "POST"],
      });
    }
  }

  if (pagesDir) {
    const pageFiles = await walk(
      pagesDir,
      IGNORED_DIRS,
      IGNORED_PATH_SEGMENTS,
      (file) => JS_EXTS.has(path.extname(file).toLowerCase()),
    );

    for (const file of pageFiles) {
      const relative = normalizeSlashes(path.relative(pagesDir, file));
      if (!relative.startsWith("api/")) continue;

      const noExt = relative.replace(/\.[^.]+$/, "");
      const text = await fsp.readFile(file, "utf8");
      const route = `/${noExt}`.replace(/\/+/g, "/");

      const methods = new Set();
      const reqMethodMatches =
        text.match(
          /req\.method\s*===\s*['"`](GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)['"`]/gi,
        ) || [];
      for (const item of reqMethodMatches) {
        const found = item.match(
          /['"`](GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)['"`]/i,
        );
        if (found) methods.add(found[1].toUpperCase());
      }

      apiRoutes.push({
        path: route,
        file: toRelative(file),
        methods:
          methods.size > 0 ? Array.from(methods).sort() : ["GET", "POST"],
      });
    }
  }

  return apiRoutes.sort(
    (a, b) => a.path.localeCompare(b.path) || a.file.localeCompare(b.file),
  );
}

async function scanApi(packageJson) {
  const nextApiRoutes = await scanNextApiRoutes();
  if (nextApiRoutes.length > 0) {
    return {
      type: "next-api",
      routes: nextApiRoutes,
    };
  }

  const allJsFiles = await walk(
    root,
    IGNORED_DIRS,
    IGNORED_PATH_SEGMENTS,
    (file) => JS_EXTS.has(path.extname(file).toLowerCase()),
  );

  const expressFiles = [];
  const expressRoutes = [];

  const hasExpressDep = hasAnyDependency(packageJson, ["express"]);

  for (const file of allJsFiles) {
    const text = await fsp.readFile(file, "utf8");

    if (
      /\bfrom\s+['"`]express['"`]/.test(text) ||
      /\brequire\s*\(\s*['"`]express['"`]\s*\)/.test(text) ||
      /\bexpress\s*\(\s*\)/.test(text) ||
      /\bexpress\.Router\s*\(\s*\)/.test(text)
    ) {
      expressFiles.push(toRelative(file));

      for (const route of extractExpressRoutes(text)) {
        expressRoutes.push({
          path: route.path,
          file: toRelative(file),
          methods: route.methods,
        });
      }
    }
  }

  if (hasExpressDep || expressFiles.length > 0) {
    return {
      type: "express",
      routes: expressRoutes.sort(
        (a, b) => a.path.localeCompare(b.path) || a.file.localeCompare(b.file),
      ),
      files: uniqueSorted(expressFiles),
    };
  }

  const apiClientFiles = new Set();

  for (const file of allJsFiles) {
    const relative = toRelative(file);
    const text = await fsp.readFile(file, "utf8");

    if (
      relative.includes("/api/") ||
      relative.includes("\\api\\") ||
      /(^|\/)(api|services|service|client)(\/|$)/i.test(relative)
    ) {
      for (const hit of findApiClientEvidence(text, relative)) {
        apiClientFiles.add(hit);
      }
      continue;
    }

    for (const hit of findApiClientEvidence(text, relative)) {
      apiClientFiles.add(hit);
    }
  }

  if (apiClientFiles.size > 0) {
    return {
      type: "client-only",
      files: Array.from(apiClientFiles).sort(),
    };
  }

  return {
    type: "unknown",
  };
}

module.exports = {
  scanApi,
};
