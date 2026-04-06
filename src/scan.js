const path = require("path");
const { detectFramework } = require("./framework");
const { detectArchitecture } = require("./architecture");
const { detectEntrypoints } = require("./entryPoints");
const { collectConfigFiles } = require("./configs");
const { pickScripts } = require("./scripts");
const { scanApi } = require("./api");
const { scanEnv } = require("./env");
const { fsp, root } = require("./utils");
const { IGNORED_DIRS, IGNORED_PATH_SEGMENTS } = require("./constants");

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

  const framework = await detectFramework(packageJson);
  const structure = await detectArchitecture();
  const entrypoints = await detectEntrypoints(framework);
  const configFiles = await collectConfigFiles();
  const scripts = pickScripts(packageJson);
  const api = await scanApi(packageJson);
  const env = await scanEnv(IGNORED_DIRS, IGNORED_PATH_SEGMENTS);

  const result = {
    tool: "devlens",
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    project: {
      name: projectName,
      root: ".",
    },
    framework,
    structure,
  };

  if (entrypoints) {
    result.entrypoints = entrypoints;
  }

  if (configFiles) {
    result.configFiles = configFiles;
  }

  if (scripts) {
    result.scripts = scripts;
  }

  if (api) {
    result.api = api;
  }

  if (env) {
    result.env = env;
  }

  return result;
}

module.exports = {
  scan,
};
