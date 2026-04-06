const path = require("path");
const { pathExists, root, uniqueSorted } = require("./utils");

async function detectEntrypoints(framework) {
  const entrypoints = {};

  const frontendCandidates = [
    "src/main.tsx",
    "src/main.jsx",
    "src/index.tsx",
    "src/index.jsx",
    "main.tsx",
    "main.jsx",
    "index.tsx",
    "index.jsx",
  ];

  const appCandidates = [
    "src/app/App.tsx",
    "src/app/App.jsx",
    "src/App.tsx",
    "src/App.jsx",
    "app/page.tsx",
    "src/app/page.tsx",
  ];

  const routerCandidates = [
    "src/app/router.tsx",
    "src/app/router.jsx",
    "src/app/providers/router.tsx",
    "src/app/providers/router.jsx",
    "src/router.tsx",
    "src/router.jsx",
    "app",
    "src/app",
    "pages",
    "src/pages",
  ];

  const serverCandidates = [
    "server/index.ts",
    "server/index.js",
    "src/server/index.ts",
    "src/server/index.js",
    "api/index.ts",
    "api/index.js",
  ];

  const frontend = [];
  for (const rel of frontendCandidates) {
    if (await pathExists(path.join(root, rel))) frontend.push(rel);
  }

  const app = [];
  for (const rel of appCandidates) {
    if (await pathExists(path.join(root, rel))) app.push(rel);
  }

  const router = [];
  for (const rel of routerCandidates) {
    if (await pathExists(path.join(root, rel))) router.push(rel);
  }

  const server = [];
  for (const rel of serverCandidates) {
    if (await pathExists(path.join(root, rel))) server.push(rel);
  }

  if (frontend.length > 0) entrypoints.frontend = uniqueSorted(frontend);
  if (app.length > 0) entrypoints.app = uniqueSorted(app);
  if (router.length > 0) entrypoints.router = uniqueSorted(router);
  if (server.length > 0) entrypoints.server = uniqueSorted(server);

  if (
    framework.name === "nextjs" &&
    !entrypoints.frontend &&
    ((await pathExists(path.join(root, "app"))) ||
      (await pathExists(path.join(root, "src", "app"))) ||
      (await pathExists(path.join(root, "pages"))) ||
      (await pathExists(path.join(root, "src", "pages"))))
  ) {
    entrypoints.router = uniqueSorted([
      ...(entrypoints.router || []),
      ...((await pathExists(path.join(root, "app"))) ? ["app"] : []),
      ...((await pathExists(path.join(root, "src", "app"))) ? ["src/app"] : []),
      ...((await pathExists(path.join(root, "pages"))) ? ["pages"] : []),
      ...((await pathExists(path.join(root, "src", "pages")))
        ? ["src/pages"]
        : []),
    ]);
  }

  return Object.keys(entrypoints).length > 0 ? entrypoints : null;
}

module.exports = {
  detectEntrypoints,
};
