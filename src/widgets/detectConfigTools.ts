export function detectConfigTools({
  configFiles,
  packageJson,
}: {
  configFiles: string[];
  packageJson?: Record<string, any>;
}) {
  const tools = new Set();

  if (
    configFiles.includes("tsconfig.json") ||
    configFiles.includes("tsconfig.app.json") ||
    configFiles.includes("tsconfig.node.json") ||
    packageJson?.dependencies?.typescript ||
    packageJson?.devDependencies?.typescript
  ) {
    tools.add("typescript");
  }

  if (
    configFiles.some((file) => file.startsWith("vite.config")) ||
    packageJson?.dependencies?.vite ||
    packageJson?.devDependencies?.vite
  ) {
    tools.add("vite");
  }

  if (
    configFiles.some((file) => file.startsWith("vitest.config")) ||
    packageJson?.dependencies?.vitest ||
    packageJson?.devDependencies?.vitest
  ) {
    tools.add("vitest");
  }

  if (
    configFiles.some(
      (file) =>
        file.startsWith("eslint.config") ||
        file === ".eslintrc" ||
        file === ".eslintrc.json" ||
        file === ".eslintrc.js" ||
        file === ".eslintrc.cjs",
    ) ||
    packageJson?.dependencies?.eslint ||
    packageJson?.devDependencies?.eslint
  ) {
    tools.add("eslint");
  }

  if (
    configFiles.some(
      (file) =>
        file.startsWith("prettier.config") || file.startsWith(".prettierrc"),
    ) ||
    packageJson?.dependencies?.prettier ||
    packageJson?.devDependencies?.prettier
  ) {
    tools.add("prettier");
  }

  return Array.from(tools).sort();
}
