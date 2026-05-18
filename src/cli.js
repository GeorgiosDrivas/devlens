const path = require("path");
const { fsp, root } = require("./utils");
const { scan } = require("./scan");
const { push } = require("./push");

const DEFAULT_COMMAND = "init";

function getFlagValue(args, name) {
  const index = args.findIndex((arg) => arg === name);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
}

async function runInit(args) {
  const result = await scan();

  if (args.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const outFile = getFlagValue(args, "--out") || "project-structure.json";
  const outputFile = path.resolve(root, outFile);
  await fsp.mkdir(path.dirname(outputFile), { recursive: true });
  await fsp.writeFile(outputFile, JSON.stringify(result, null, 2), "utf8");
  console.log(`Written ${outputFile}`);
}

async function runPush(args) {
  const result = await scan();
  const written = await push(result, getFlagValue(args, "--target"));
  for (const file of written) {
    console.log(`Updated ${file}`);
  }
}

const COMMANDS = {
  init: {
    summary: "Generate project-structure.json (default)",
    run: runInit,
  },
  push: {
    summary: "Embed the manifest into an agent file (CLAUDE.md, AGENTS.md, ...)",
    run: runPush,
  },
};

function printHelp() {
  console.log(
    "Usage: devlens [command] [--json] [--out <file>] [--target <file>]\n",
  );
  console.log("Commands:");
  for (const [name, command] of Object.entries(COMMANDS)) {
    console.log(`  ${name.padEnd(8)} ${command.summary}`);
  }
  console.log("\nFlags:");
  console.log("  --json          Print JSON to stdout (init only)");
  console.log("  --out <file>    Write manifest to a custom file path (init only)");
  console.log("  --target <file> Agent file to push into (push only)");
  console.log("  --help, -h      Show help");
  console.log(`\nIf no command is provided, "${DEFAULT_COMMAND}" is used.`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("help") || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const commandName =
    args.find((arg) => !arg.startsWith("-")) || DEFAULT_COMMAND;
  const command = COMMANDS[commandName];

  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    console.error(`Available commands: ${Object.keys(COMMANDS).join(", ")}`);
    process.exit(1);
  }

  try {
    await command.run(args);
    process.exit(0);
  } catch (err) {
    console.error("error:", err?.message || err);
    process.exit(1);
  }
}

module.exports = {
  printHelp,
  main,
  COMMANDS,
};