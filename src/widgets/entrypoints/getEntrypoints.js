function getEntrypoints(packageJson, projectName) {
  const bin = packageJson?.bin;
  let normalizedBin = null;

  if (typeof bin === "string") {
    const name = projectName.replace(/^@[^/]+\//, "");
    normalizedBin = { [name]: bin };
  } else if (bin && typeof bin === "object") {
    normalizedBin = bin;
  }

  return {
    bin: normalizedBin,
    main: packageJson?.main || null,
    module: packageJson?.module || null,
    types: packageJson?.types || packageJson?.typings || null,
  };
}

module.exports = { getEntrypoints };
