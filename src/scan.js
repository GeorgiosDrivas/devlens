const path = require("path");
const { collectConfigFiles } = require("./configs");
const { pickScripts } = require("./scripts");
const { fsp, root, uniqueSorted } = require("./utils");
const git = require("./git");
const { detectConfigTools } = require("./widgets/detectConfigTools");
const { getPackageManager } = require("./widgets/getPackageManager");
const { hasTests } = require("./widgets/source/hasTests");
const { hasDockerConfig } = require("./widgets/source/hasDockerConfig");
const { hasCiConfig } = require("./widgets/source/hasCiConfig");
const {
  buildDependencyCategories,
} = require("./widgets/dependencies/buildDependencyCategories");
const {
  collectCodebaseMetrics,
} = require("./widgets/codebase/collectCodebaseMetrics");
const { getEntrypoints } = require("./widgets/entrypoints/getEntrypoints");
const {
  detectLanguageHints,
} = require("./widgets/runtime/detectLanguageHints");

async function readJson(filePath) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
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

  let gitInfo = null;
  try {
    gitInfo = git();
  } catch {
    console.log(
      "Not a git repository or git command failed, skipping git info.",
    );
  }

  return {
    project: {
      name: projectName,
    },
    git: gitInfo,
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
