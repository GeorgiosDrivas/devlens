function pickScripts(packageJson) {
  const scripts = packageJson?.scripts || {};
  const preferredOrder = [
    "dev",
    "start",
    "build",
    "test",
    "lint",
    "format",
    "preview",
    "typecheck",
  ];

  const result = {};

  for (const key of preferredOrder) {
    if (scripts[key]) {
      result[key] = scripts[key];
    }
  }

  for (const [key, value] of Object.entries(scripts)) {
    if (!(key in result)) {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

module.exports = {
  pickScripts,
};
