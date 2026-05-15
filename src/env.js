const path = require("path");
const { root, fsp, pathExists, toRelative, walk } = require("./utils");
const { SOURCE_EXTS } = require("./constants");

async function collectEnvFromDotFiles(files) {
  const envVars = {};

  for (const file of files) {
    const content = await fsp.readFile(file, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const noComment = line.split("#")[0].trim();
      if (!noComment) continue;

      const eq = noComment.indexOf("=");
      if (eq <= 0) continue;

      const name = noComment.slice(0, eq).trim();
      if (!name) continue;

      if (!envVars[name]) {
        envVars[name] = [];
      }

      envVars[name].push(toRelative(file));
    }
  }

  return envVars;
}

function findEnvReferencesInText(text) {
  const used = new Set();

  const patterns = [
    /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
    /import\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
    /process\.env\s*\[\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\]/g,
    /import\.meta\.env\s*\[\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\]/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      used.add(match[1]);
    }
  }

  return Array.from(used);
}

async function scanEnv(IGNORED_DIRS, IGNORED_PATH_SEGMENTS) {
  const dotCandidates = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
    ".env.production",
    ".env.production.local",
    ".env.test",
    ".env.test.local",
  ];

  const envFiles = [];
  for (const envFile of dotCandidates) {
    const full = path.join(root, envFile);
    if (await pathExists(full)) {
      envFiles.push(full);
    }
  }

  const declaredEnv = await collectEnvFromDotFiles(envFiles);

  const allSourceFiles = await walk(
    root,
    IGNORED_DIRS,
    IGNORED_PATH_SEGMENTS,
    (file) => {
      const ext = path.extname(file).toLowerCase();
      return SOURCE_EXTS.has(ext);
    },
  );

  const referencedEnv = {};

  for (const file of allSourceFiles) {
    const text = await fsp.readFile(file, "utf8");
    const keys = findEnvReferencesInText(text);

    for (const key of keys) {
      if (!referencedEnv[key]) {
        referencedEnv[key] = new Set();
      }
      referencedEnv[key].add(toRelative(file));
    }
  }

  const used = [];
  const unused = [];
  const missing = [];

  for (const [name, files] of Object.entries(referencedEnv)) {
    if (declaredEnv[name]) {
      used.push({
        name,
        files: Array.from(files).sort(),
      });
    } else {
      missing.push({
        name,
        referencedIn: Array.from(files).sort(),
      });
    }
  }

  for (const [name, filePaths] of Object.entries(declaredEnv)) {
    if (!referencedEnv[name]) {
      unused.push({
        name,
        declaredIn: Array.from(new Set(filePaths)).sort(),
      });
    }
  }

  const declared = Object.keys(declaredEnv).sort();

  const env = {
    used: used.sort((a, b) => a.name.localeCompare(b.name)),
    declared,
    unused: unused.sort((a, b) => a.name.localeCompare(b.name)),
    missing: missing.sort((a, b) => a.name.localeCompare(b.name)),
  };

  return hasEnvData(env) ? env : null;
}

function hasEnvData(env) {
  return (
    env.used.length > 0 ||
    env.declared.length > 0 ||
    env.unused.length > 0 ||
    env.missing.length > 0
  );
}

module.exports = {
  scanEnv,
  collectEnvFromDotFiles,
  findEnvReferencesInText,
  hasEnvData,
};
