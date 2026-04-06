const path = require("path");
const { pathExists, root, uniqueSorted } = require("./utils");
const { CONFIG_FILE_CANDIDATES } = require("./constants");

async function collectConfigFiles() {
  const found = [];

  for (const rel of CONFIG_FILE_CANDIDATES) {
    if (await pathExists(path.join(root, rel))) {
      found.push(rel);
    }
  }

  return found.length > 0 ? uniqueSorted(found) : null;
}

module.exports = {
  collectConfigFiles,
};
