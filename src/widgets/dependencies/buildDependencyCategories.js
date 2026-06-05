const { uniqueSorted } = require("../../utils");

function buildDependencyCategories(packageJson) {
  const categories = {
    ui: [],
    server: [],
    testing: [],
  };

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const uiPackages = [
    "react",
    "react-dom",
    "preact",
    "vue",
    "svelte",
    "angular",
    "next",
    "@angular/core",
    "@mui/material",
    "solid-js",
    "lit",
  ];
  const serverPackages = [
    "express",
    "koa",
    "fastify",
    "hapi",
    "nestjs",
    "@nestjs/core",
    "apollo-server",
    "hono",
    "elysia",
  ];
  const testingPackages = [
    "vitest",
    "jest",
    "mocha",
    "chai",
    "cypress",
    "playwright",
    "@testing-library/react",
    "@testing-library/vue",
    "@testing-library/svelte",
    "ava",
    "tap",
  ];

  for (const dependency of Object.keys(allDeps || {})) {
    if (
      uiPackages.some(
        (name) => dependency === name || dependency.startsWith(`${name}/`),
      )
    ) {
      categories.ui.push(dependency);
    }
    if (
      serverPackages.some(
        (name) => dependency === name || dependency.startsWith(`${name}/`),
      )
    ) {
      categories.server.push(dependency);
    }
    if (
      testingPackages.some(
        (name) => dependency === name || dependency.startsWith(`${name}/`),
      )
    ) {
      categories.testing.push(dependency);
    }
  }

  categories.ui = uniqueSorted(categories.ui);
  categories.server = uniqueSorted(categories.server);
  categories.testing = uniqueSorted(categories.testing);

  return categories;
}

module.exports = { buildDependencyCategories };
