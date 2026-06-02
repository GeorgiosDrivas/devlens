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
const git = require("./git");
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

function getEntrypoints(packageJson, projectName) {
  const bin = packageJson?.bin;
  let normalizedBin = null;

  if (typeof bin === "string") {
    const name = projectName.replace(/^@[^/]+\//, "");
    normalizedBin = { [name]: bin };
  } else if (bin && typeof bin === "object") {
    normalizedBin = bin;
  }

  return {
    bin: normalizedBin,
    main: packageJson?.main || null,
    module: packageJson?.module || null,
    types: packageJson?.types || packageJson?.typings || null,
  };
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

function isCodeFile(file) {
  return [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(
    path.extname(file).toLowerCase(),
  );
}

function isTestFile(file) {
  const normalized = file.replace(/\\/g, "/");
  const basename = path.basename(file).toLowerCase();
  return (
    /(^|\/)(__tests__|tests|test)(\/|$)/.test(normalized) ||
    /\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$/.test(basename)
  );
}

async function countLines(filePath) {
  const contents = await fsp.readFile(filePath, "utf8");
  return contents.split("\n").length;
}

async function collectCodebaseMetrics() {
  const codeFiles = await walk(
    root,
    IGNORED_DIRS,
    IGNORED_PATH_SEGMENTS,
    isCodeFile,
  );
  const testFiles = codeFiles.filter(isTestFile);
  let linesOfCode = 0;

  for (const file of codeFiles) {
    linesOfCode += await countLines(file);
  }

  return {
    sourceFiles: codeFiles.length - testFiles.length,
    testFiles: testFiles.length,
    linesOfCode,
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

  const rootEntries = await fsp.readdir(root, { withFileTypes: true });
  const rootFiles = [];

  for (const entry of rootEntries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) continue;
    rootFiles.push(entry.name);
  }

  const runtime = {
    packageManager: getPackageManager(packageJson, rootFiles),
    languageHints: await detectLanguageHints(packageJson),
  };

  const codebase = await collectCodebaseMetrics();

  return {
    project: {
      name: projectName,
    },
    git,
    runtime,
    entrypoints: getEntrypoints(packageJson, projectName),
    codebase,
    dependencies: {
      production: uniqueSorted(Object.keys(packageJson.dependencies || {})),
      development: uniqueSorted(Object.keys(packageJson.devDependencies || {})),
      categories: buildDependencyCategories(packageJson),
    },
    scripts,
    config: {
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
