const path = require("path");
const fsp = require("fs").promises;
const { walk, root } = require("../../utils");
const { IGNORED_DIRS, IGNORED_PATH_SEGMENTS } = require("../../constants");
const root = process.cwd();

async function countLines(filePath) {
  const contents = await fsp.readFile(filePath, "utf8");
  return contents.split("\n").length;
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

module.exports = { collectCodebaseMetrics };
