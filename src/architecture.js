const path = require("path");
const { pathExists, root } = require("./utils");

function detectArchitecture() {
  const checks = [
    { key: "src/app", label: "app" },
    { key: "src/pages", label: "pages" },
    { key: "src/widgets", label: "widgets" },
    { key: "src/features", label: "features" },
    { key: "src/entities", label: "entities" },
    { key: "src/shared", label: "shared" },
    { key: "src/processes", label: "processes" },
  ];

  return Promise.all(
    checks.map(async ({ key, label }) => ({
      label,
      key,
      exists: await pathExists(path.join(root, key)),
    })),
  ).then((results) => {
    const fsdCore = ["app", "pages", "features", "entities", "shared"];
    const found = Object.fromEntries(
      results
        .filter((item) => item.exists)
        .map((item) => [item.label, item.key]),
    );

    const foundLabels = Object.keys(found);
    const hasFsd = fsdCore.every((label) => foundLabels.includes(label));

    return {
      architecture: hasFsd ? "fsd" : "unknown",
      directories: found,
    };
  });
}

module.exports = {
  detectArchitecture,
};
