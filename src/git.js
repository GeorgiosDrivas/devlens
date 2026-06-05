const childProcess = require("child_process");

const runGit = (args, options = {}) => {
  const { cwd = process.cwd() } = options;
  try {
    const output = childProcess.execSync(`git ${args}`, {
      cwd,
      stdio: "pipe",
      windowsHide: true,
      encoding: "utf8",
    });
    return output.trim();
  } catch {
    throw new Error(`Git command failed: git ${args}`);
  }
};

const gitBranch = () => {
  return runGit("branch --show-current");
};

const gitRemote = () => {
  return runGit("remote get-url origin");
};

const gitLastCommit = () => {
  return childProcess
    .execFileSync("git", ["log", "-1", "--pretty=format:%h - %s"], {
      encoding: "utf8",
    })
    .trim();
};

const git = () => {
  return {
    Branch: gitBranch(),
    remoteUrl: gitRemote(),
    lastCommit: gitLastCommit(),
  };
};

module.exports = git;
