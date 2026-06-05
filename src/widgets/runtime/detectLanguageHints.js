const path = require("path");
const { walk } = require("../../utils");
const { IGNORED_DIRS, IGNORED_PATH_SEGMENTS } = require("../../constants");
const { findFirstExistingPath } = require("../../utils");
const root = process.cwd();

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

module.exports = { detectLanguageHints };
