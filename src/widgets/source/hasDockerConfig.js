const path = require("path");
const { root } = require("../../utils");
const { pathExists } = require("../../utils");

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

module.exports = { hasDockerConfig };
