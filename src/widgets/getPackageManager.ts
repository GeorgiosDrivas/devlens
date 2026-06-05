export function getPackageManager({
  packageJson,
  rootFiles,
}: {
  packageJson: any;
  rootFiles: string[];
}): "npm" | "yarn" | "pnpm" {
  if (rootFiles.includes("pnpm-lock.yaml")) return "pnpm";
  if (rootFiles.includes("yarn.lock")) return "yarn";
  if (rootFiles.includes("package-lock.json")) return "npm";
  if (packageJson?.packageManager) {
    if (packageJson.packageManager.includes("pnpm")) return "pnpm";
    if (packageJson.packageManager.includes("yarn")) return "yarn";
    return "npm";
  }
  return "npm";
}
