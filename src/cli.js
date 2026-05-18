const path = require("path");
const { fsp, root } = require("./utils");
const { scan } = require("./scan");
const { push } = require("./push");

function printHelp() {
  console.log(
    "Usage: devlens [command] [--json] [--out <file>] [--target <file>]\n",
  );
  console.log("Commands:");
  console.log("  init     Generate project-structure.json (default)");
  console.log(
    "  push     Embed the manifest into an agent file (CLAUDE.md, AGENTS.md, ...)",
  );
  console.log("\nFlags:");
  console.log("  --json          Print JSON to stdout (init only)");
  console.log("  --out <file>    Write manifest to a custom file path (init only)");
  console.log("  --target <file> Agent file to push into (push only)");
  console.log("  --help, -h      Show help");
  console.log('\nIf no command is provided, "init" is used by default.');
}

function getFlagValue(args, name) {
  const index = args.findIndex((arg) => arg === name);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("help") || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const wantsJson = args.includes("--json");
  const command = args.find((arg) => !arg.startsWith("-")) || "init";

  if (command !== "init" && command !== "push") {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }

  try {
    const result = await scan();

    if (command === "push") {
      const target = getFlagValue(args, "--target");
      const written = await push(result, target);
      for (const file of written) {
        console.log(`Updated ${file}`);
      }
      process.exit(0);
    }

    if (wantsJson) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    const outFile = getFlagValue(args, "--out") || "project-structure.json";
    const outputFile = path.resolve(root, outFile);
    await fsp.mkdir(path.dirname(outputFile), { recursive: true });
    await fsp.writeFile(outputFile, JSON.stringify(result, null, 2), "utf8");
    console.log(`Written ${outputFile}`);
    process.exit(0);
  } catch (err) {
    console.error("error:", err?.message || err);
    process.exit(1);
  }
}

module.exports = {
  printHelp,
  main,
};