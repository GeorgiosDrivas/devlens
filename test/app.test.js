const test = require("node:test");
const assert = require("node:assert");

test("--help flag should print usage information", () => {
  const { execSync } = require("child_process");
  const output = execSync("node bin/devlens --help").toString();
  assert.match(output, /Usage:/);
});

test("wrong flag should display an error message", () => {
  const { execSync } = require("child_process");
  try {
    execSync("node bin/devlens --wrongflag").toString();
  } catch (error) {
    assert.match(error.stderr.toString(), /Unknown option/);
  }
});
