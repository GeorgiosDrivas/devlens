const path = require("path");
const { collectConfigFiles } = require("./configs");
const { pickScripts } = require("./scripts");
const { scanEnv } = require("./env");
const {
  fsp,
  root,
  uniqueSorted,
  pathExists,
  walk,
  findFirstExistingPath,
  hasAnyDependency,
} = require("./utils");
const { IGNORED_DIRS, IGNORED_PATH_SEGMENTS } = require("./constants");

async function readJson(filePath) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getPackageManager(packageJson, rootFiles) {
  if (rootFiles.includes("pnpm-lock.yaml")) return "pnpm";
  if (rootFiles.includes("yarn.lock")) return "yarn";
  if (rootFiles.includes("package-lock.json")) return "npm";
  if (packageJson?.packageManager) {
    if (packageJson.packageManager.includes("pnpm")) return "pnpm";
    if (packageJson.packageManager.includes("yarn")) return "yarn";
    return "npm";
  }
  return "npm";
}

function getModuleSystem(packageJson) {
  return packageJson?.type === "module" ? "esm" : "commonjs";
}

function isWorkspacePackage(packageJson) {
  return Boolean(
    packageJson?.workspaces ||
    (packageJson?.packageManager &&
      packageJson.packageManager.includes("workspaces")),
  );
}

async function detectLanguageHints(packageJson) {
  const hints = new Set();

  if (
    packageJson?.dependencies?.typescript ||
    packageJson?.devDependencies?.typescript
  ) {
    hints.add("typescript");
  }

  const tsConfig = await findFirstExistingPath([
    path.join(root, "tsconfig.json"),
    path.join(root, "tsconfig.app.json"),
    path.join(root, "tsconfig.node.json"),
    path.join(root, "jsconfig.json"),
  ]);

  if (tsConfig) {
    hints.add("typescript");
  }

  if (hints.size > 0) {
    return Array.from(hints).sort();
  }

  const sourceFiles = await walk(
    root,
    IGNORED_DIRS,
    IGNORED_PATH_SEGMENTS,
    (file) => /\.(ts|tsx|mts|cts)$/.test(path.extname(file).toLowerCase()),
  );

  if (sourceFiles.length > 0) {
    return ["typescript"];
  }

  return ["javascript"];
}

async function collectFilesystem() {
  const entries = await fsp.readdir(root, { withFileTypes: true });
  const topLevelDirectories = [];
  const topLevelFiles = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      topLevelDirectories.push(entry.name);
      continue;
    }

    topLevelFiles.push(entry.name);
  }

  return {
    topLevelDirectories: uniqueSorted(topLevelDirectories),
    _topLevelFiles: uniqueSorted(topLevelFiles),
  };
}

function buildDependencyCategories(packageJson) {
  const categories = {
    ui: [],
    server: [],
    testing: [],
  };

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const uiPackages = [
    "react",
    "react-dom",
    "preact",
    "vue",
    "svelte",
    "angular",
    "next",
    "@angular/core",
    "@mui/material",
    "solid-js",
    "lit",
  ];
  const serverPackages = [
    "express",
    "koa",
    "fastify",
    "hapi",
    "nestjs",
    "@nestjs/core",
    "apollo-server",
    "hono",
    "elysia",
  ];
  const testingPackages = [
    "vitest",
    "jest",
    "mocha",
    "chai",
    "cypress",
    "playwright",
    "@testing-library/react",
    "@testing-library/vue",
    "@testing-library/svelte",
    "ava",
    "tap",
  ];

  for (const dependency of Object.keys(allDeps || {})) {
    if (
      uiPackages.some(
        (name) => dependency === name || dependency.startsWith(`${name}/`),
      )
    ) {
      categories.ui.push(dependency);
    }
    if (
      serverPackages.some(
        (name) => dependency === name || dependency.startsWith(`${name}/`),
      )
    ) {
      categories.server.push(dependency);
    }
    if (
      testingPackages.some(
        (name) => dependency === name || dependency.startsWith(`${name}/`),
      )
    ) {
      categories.testing.push(dependency);
    }
  }

  categories.ui = uniqueSorted(categories.ui);
  categories.server = uniqueSorted(categories.server);
  categories.testing = uniqueSorted(categories.testing);

  return categories;
}

function detectConfigTools(configFiles, packageJson) {
  const tools = new Set();

  if (
    configFiles.includes("tsconfig.json") ||
    configFiles.includes("tsconfig.app.json") ||
    configFiles.includes("tsconfig.node.json") ||
    packageJson?.dependencies?.typescript ||
    packageJson?.devDependencies?.typescript
  ) {
    tools.add("typescript");
  }

  if (
    configFiles.some((file) => file.startsWith("vite.config")) ||
    packageJson?.dependencies?.vite ||
    packageJson?.devDependencies?.vite
  ) {
    tools.add("vite");
  }

  if (
    configFiles.some((file) => file.startsWith("vitest.config")) ||
    packageJson?.dependencies?.vitest ||
    packageJson?.devDependencies?.vitest
  ) {
    tools.add("vitest");
  }

  if (
    configFiles.some(
      (file) =>
        file.startsWith("eslint.config") ||
        file === ".eslintrc" ||
        file === ".eslintrc.json" ||
        file === ".eslintrc.js" ||
        file === ".eslintrc.cjs",
    ) ||
    packageJson?.dependencies?.eslint ||
    packageJson?.devDependencies?.eslint
  ) {
    tools.add("eslint");
  }

  if (
    configFiles.some(
      (file) =>
        file.startsWith("prettier.config") || file.startsWith(".prettierrc"),
    ) ||
    packageJson?.dependencies?.prettier ||
    packageJson?.devDependencies?.prettier
  ) {
    tools.add("prettier");
  }

  return Array.from(tools).sort();
}

async function hasCiConfig() {
  const candidates = [
    path.join(root, ".github", "workflows"),
    path.join(root, ".travis.yml"),
    path.join(root, "azure-pipelines.yml"),
    path.join(root, "circle.yml"),
    path.join(root, ".circleci", "config.yml"),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) return true;
  }

  return false;
}

async function hasDockerConfig() {
  const candidates = [
    path.join(root, "Dockerfile"),
    path.join(root, "docker-compose.yml"),
    path.join(root, "docker-compose.yaml"),
    path.join(root, ".dockerignore"),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) return true;
  }

  return false;
}

function hasTests(packageJson, scripts) {
  if (scripts?.test) return true;

  return hasAnyDependency(packageJson, [
    "vitest",
    "jest",
    "mocha",
    "cypress",
    "playwright",
    "@testing-library/react",
    "@testing-library/vue",
    "@testing-library/svelte",
    "ava",
    "tap",
  ]);
}

async function scan() {
  const packageJson = (await readJson(path.join(root, "package.json"))) || {};
  const projectName = packageJson.name || path.basename(root) || "my-app";

  const configFiles = await collectConfigFiles();
  const scripts = pickScripts(packageJson) || {};
  const env = (await scanEnv(IGNORED_DIRS, IGNORED_PATH_SEGMENTS)) || {
    used: [],
    declared: [],
    missing: [],
    unused: [],
  };
  const filesystem = await collectFilesystem();
  const runtime = {
    packageManager: getPackageManager(packageJson, filesystem._topLevelFiles),
    moduleSystem: getModuleSystem(packageJson),
    languageHints: await detectLanguageHints(packageJson),
  };

  return {
    tool: "devlens",
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    project: {
      name: projectName,
    },
    runtime,
    filesystem: {
      topLevelDirectories: filesystem.topLevelDirectories,
    },
    dependencies: {
      production: uniqueSorted(Object.keys(packageJson.dependencies || {})),
      development: uniqueSorted(Object.keys(packageJson.devDependencies || {})),
      categories: buildDependencyCategories(packageJson),
    },
    scripts,
    config: {
      files: configFiles || [],
      tools: detectConfigTools(configFiles || [], packageJson),
    },
    environment: {
      declared: env.declared || [],
      used: env.used,
      missing: env.missing,
      unused: env.unused,
    },
    source: {
      hasDocker: await hasDockerConfig(),
      hasCLI: Boolean(packageJson.bin),
      hasTests: hasTests(packageJson, scripts),
      hasCI: await hasCiConfig(),
    },
  };
}

module.exports = {
  scan,
};
