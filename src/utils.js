const fs = require("fs");
const { promises: fsp } = fs;
const path = require("path");

const root = process.cwd();

function pathExists(p) {
  return fsp
    .access(p)
    .then(() => true)
    .catch(() => false);
}

function normalizeSlashes(value) {
  return value.replace(/\\/g, "/");
}

function toRelative(filePath) {
  const relative = normalizeSlashes(path.relative(root, filePath));
  return relative || ".";
}

function isIgnoredPath(IGNORED_DIRS, IGNORED_PATH_SEGMENTS, fullPath) {
  const relative = toRelative(fullPath);
  const parts = relative.split("/");

  if (parts.some((part) => IGNORED_DIRS.has(part))) {
    return true;
  }

  return IGNORED_PATH_SEGMENTS.some(
    (segment) => relative === segment || relative.startsWith(`${segment}/`),
  );
}

async function walk(dir, IGNORED_DIRS, IGNORED_PATH_SEGMENTS, filter) {
  const results = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (isIgnoredPath(IGNORED_DIRS, IGNORED_PATH_SEGMENTS, full)) continue;
      results.push(
        ...(await walk(full, IGNORED_DIRS, IGNORED_PATH_SEGMENTS, filter)),
      );
      continue;
    }

    if (isIgnoredPath(IGNORED_DIRS, IGNORED_PATH_SEGMENTS, full)) continue;
    if (!filter || filter(full)) {
      results.push(full);
    }
  }

  return results;
}

async function findFirstExistingPath(candidates) {
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function hasAnyDependency(packageJson, names) {
  const deps = packageJson?.dependencies || {};
  const devDeps = packageJson?.devDependencies || {};

  return names.some((name) => deps[name] || devDeps[name]);
}

module.exports = {
  pathExists,
  normalizeSlashes,
  toRelative,
  isIgnoredPath,
  walk,
  findFirstExistingPath,
  uniqueSorted,
  hasAnyDependency,
  root,
  fsp,
  path,
};
