const childProcess = require("child_process");

const runGit = (args, options = {}) => {
  const { cwd = process.cwd() } = options;
  childProcess.execSync(
    `git ${args}`,
    {
      cwd,
      stdio: "inherit",
      windowsHide: true,
    },
    (err) => {
      if (err) {
        throw new Error(`Git command failed: git ${args}`);
      }
    },
  );
};

const gitBranch = () => {
  return runGit("branch --show-current");
};

const gitRemote = () => {
  return runGit("remote get-url origin");
};

const gitLastCommit = () => {
  return runGit("log -1 --pretty=format:'%h - %s' ");
};

const git = () => {
  return {
    Branch: gitBranch(),
    remoteUrl: gitRemote(),
    lastCommit: gitLastCommit(),
  };
};

module.exports = git;
