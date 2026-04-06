const path = require("path");
const { pathExists, root } = require("./utils");

async function detectFramework(packageJson) {
  const deps = packageJson?.dependencies || {};
  const devDeps = packageJson?.devDependencies || {};
  const evidence = [];

  const hasAppDir =
    (await pathExists(path.join(root, "app"))) ||
    (await pathExists(path.join(root, "src", "app")));

  const hasPagesDir =
    (await pathExists(path.join(root, "pages"))) ||
    (await pathExists(path.join(root, "src", "pages")));

  if (deps.next || devDeps.next) {
    return {
      name: "nextjs",
      confidence: 0.98,
      evidence: ["package.json dependency: next"],
    };
  }

  if (hasAppDir) {
    return {
      name: "nextjs",
      confidence: 0.76,
      evidence: ["app directory found"],
    };
  }

  if (hasPagesDir) {
    return {
      name: "nextjs",
      confidence: 0.7,
      evidence: ["pages directory found"],
    };
  }

  let reactScore = 0;

  if (deps.react || devDeps.react) {
    reactScore += 0.35;
    evidence.push("package.json dependency: react");
  }

  if (deps["react-dom"] || devDeps["react-dom"]) {
    reactScore += 0.25;
    evidence.push("package.json dependency: react-dom");
  }

  if (
    (await pathExists(path.join(root, "src", "main.jsx"))) ||
    (await pathExists(path.join(root, "src", "main.tsx"))) ||
    (await pathExists(path.join(root, "src", "index.jsx"))) ||
    (await pathExists(path.join(root, "src", "index.tsx"))) ||
    (await pathExists(path.join(root, "main.jsx"))) ||
    (await pathExists(path.join(root, "main.tsx")))
  ) {
    reactScore += 0.2;
    evidence.push("React entry file found");
  }

  if (await pathExists(path.join(root, "index.html"))) {
    reactScore += 0.1;
    evidence.push("index.html found");
  }

  if (deps.vite || devDeps.vite) {
    reactScore += 0.1;
    evidence.push("package.json dependency: vite");
  }

  if (reactScore > 0) {
    return {
      name: "react",
      confidence: Math.min(0.95, Number(reactScore.toFixed(2))),
      evidence,
    };
  }

  return {
    name: "unknown",
    confidence: 0,
    evidence: [],
  };
}

module.exports = {
  detectFramework,
};
