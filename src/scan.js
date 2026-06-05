const path = require("path");
const { collectConfigFiles } = require("./configs");
const { pickScripts } = require("./scripts");
const {
  fsp,
  root,
  uniqueSorted,
  walk,
  findFirstExistingPath,
} = require("./utils");
const git = require("./git");
const { detectConfigTools } = require("./widgets/detectConfigTools");
const { IGNORED_DIRS, IGNORED_PATH_SEGMENTS } = require("./constants");
const { getPackageManager } = require("./widgets/getPackageManager");
const { hasTests } = require("./widgets/source/hasTests");
const { hasDockerConfig } = require("./widgets/source/hasDockerConfig");
const { hasCiConfig } = require("./widgets/source/hasCiConfig");

async function readJson(filePath) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
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

async function scan() {
  const packageJson = (await readJson(path.join(root, "package.json"))) || {};
  const projectName = packageJson.name || path.basename(root) || "my-app";

  const configFiles = await collectConfigFiles();
  const scripts = pickScripts(packageJson) || {};

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
