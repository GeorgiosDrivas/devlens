const path = require("path");
const { root } = require("../../utils");
const { pathExists } = require("../../utils");

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

module.exports = { hasCiConfig };
