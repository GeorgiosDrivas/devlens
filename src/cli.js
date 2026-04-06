const path = require("path");
const { fsp, root } = require("./utils");
const { scan } = require("./scan");

function printHelp() {
  console.log("Usage: devlens [command] [--json] [--out <file>]\n");
  console.log("Commands:");
  console.log("  init     Generate project-structure.json");
  console.log("\nFlags:");
  console.log("  --json          Print JSON to stdout");
  console.log("  --out <file>    Write manifest to a custom file path");
  console.log("  --help, -h      Show help");
  console.log('\nIf no command is provided, "init" is used by default.');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("help") || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const wantsJson = args.includes("--json");
  const command = args.find((arg) => !arg.startsWith("-")) || "init";

  const outIndex = args.findIndex((arg) => arg === "--out");
  const outFile =
    outIndex >= 0 && args[outIndex + 1]
      ? args[outIndex + 1]
      : "project-structure.json";

  if (command !== "init") {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }

  try {
    const result = await scan();

    if (wantsJson) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

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
