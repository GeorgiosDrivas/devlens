const { hasAnyDependency } = require("../../utils").hasAnyDependency;

function hasTests(packageJson, scripts) {
  if (scripts?.test) return true;

  return hasAnyDependency(packageJson, [
    "vitest",
    "jest",
    "mocha",
    "cypress",
    "playwright",
    "@testing-library/react",
    "@testing-library/vue",
    "@testing-library/svelte",
    "ava",
    "tap",
  ]);
}

module.exports = { hasTests };
