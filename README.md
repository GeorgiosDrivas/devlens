# devlens

> Generate a single JSON file that gives any AI agent an accurate picture of your project.

When you drop an agent into an unfamiliar codebase, it wastes context figuring out the basics — what package manager is in use, where the entry files are, which env vars are missing, what tools are configured. **devlens** scans your project once and produces a concise, structured manifest so agents can skip that discovery phase entirely.

## Installation

```bash
# Install local
npx @georgios-drivas/devlens

# Install globally
npm install -g @georgios-drivas/devlens
```

## Usage

Run in your project root:

```bash
npx @georgios-drivas/devlens  # writes project-structure.json
npx @georgios-drivas/devlens --json  # prints to stdout
npx @georgios-drivas/devlens --out context.json  # custom output path
npx @georgios-drivas/devlens push  # embed the manifest into your agent file
npx @georgios-drivas/devlens push --target FILE.md  # embed into a specific file
npx @georgios-drivas/devlens --help
```

_If installed globally with `npm install -g @georgios-drivas/devlens`, you can omit the `npx @georgios-drivas/` prefix and run `devlens` directly._

Commit `project-structure.json` alongside your code, or generate it on-the-fly and pipe it into your agent's context. Either works.

## What devlens scans

**Git information** — Captures the current branch, remote URL, and last commit to give agents context about the repository state and version history.

**Environment variables** — Scans code for environment variable references and cross-references them with `.env` files to flag missing or unused configuration.

**Project metadata** — Collects package manager, language hints (TypeScript/JavaScript), entry points, dependencies, scripts, and codebase metrics — everything needed for agents to understand your project without manual exploration.

## `devlens push`

`devlens push` embeds the manifest directly into your agent instructions file so it loads into context automatically — no separate file to wire up.

It looks for `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursorrules`, `.github/copilot-instructions.md`, and `.windsurfrules`, and injects the JSON into every one it finds, wrapped in marker comments:

```markdown
<!-- devlens:start -->

## Project structure

...manifest as JSON...

<!-- devlens:end -->
```

Re-running `push` replaces the block in place — it never duplicates. If no agent file exists, `push` exits with an error rather than guessing; create one first, or point it at a file explicitly with `--target`.

## Output

```json
{
  "project": {
    "name": "my-app"
  },
  "git": {
    "Branch": "main",
    "remoteUrl": "https://github.com/user/my-app.git",
    "lastCommit": "a1b2c3d - feat: add new feature"
  },
  "runtime": {
    "packageManager": "pnpm",
    "languageHints": ["typescript"]
  },
  "entrypoints": {
    "bin": { "my-app": "bin/cli.js" },
    "main": "dist/index.js",
    "module": "dist/index.mjs",
    "types": "dist/index.d.ts"
  },
  "dependencies": {
    "production": ["express", "react"],
    "development": ["eslint", "typescript", "vitest"],
    "categories": {
      "ui": ["react"],
      "server": ["express"],
      "testing": ["vitest"]
    }
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  },
  "config": {
    "tools": ["eslint", "typescript", "vite", "vitest"]
  },
  "codebase": {
    "sourceFiles": 42,
    "testFiles": 8,
    "linesOfCode": 3800
  },
  "environment": {
    "declared": ["DATABASE_URL", "STRIPE_KEY"],
    "used": [{ "name": "DATABASE_URL", "files": ["src/lib/db.ts"] }],
    "unused": [{ "name": "STRIPE_KEY", "declaredIn": [".env"] }],
    "missing": [{ "name": "REDIS_URL", "referencedIn": ["src/cache.ts"] }]
  },
  "source": {
    "hasDocker": true,
    "hasCLI": false,
    "hasTests": true,
    "hasCI": true
  }
}
```

## What each field tells an agent

**`git`** — Current repository state including branch name, remote URL, and the latest commit hash and message. Agents use this to understand version control context and avoid breaking changes.

**`runtime`** — How to install dependencies and run the project. `languageHints` signals whether to expect `.ts` files and type errors.

**`entrypoints`** — Where execution starts, resolved from `package.json` fields: `bin` (CLI executables, normalized to a name→path map), `main` (CommonJS entry), `module` (ESM entry), and `types` (TypeScript declarations). Each field is `null` when not declared.

**`dependencies.categories`** — Pre-bucketed into `ui`, `server`, and `testing` so an agent can reason about the stack without parsing all deps itself.

**`config.tools`** — The active toolchain: typescript, vite, vitest, eslint, prettier. Tells an agent which configs exist and what commands are valid.

**`codebase`** — High-level repository metrics: source file count, test file count, and total lines of code. This helps an agent estimate project size and complexity at a glance.

**`environment`** — The most immediately actionable section. `missing` lists every env var referenced in code but absent from any `.env` file — a common source of runtime failures an agent should flag or fix before doing anything else. `unused` surfaces declared vars that are never read.

**`source`** — Four booleans that answer common agent questions up front: is there a containerization setup, a CLI entry, a test suite, a CI pipeline?

## Ignored by default

Directories: `node_modules`, `.git`, `.next`, `dist`, `build`, `coverage`, `.turbo`, `.vercel`, `out`

Path segments: `generated/`, `src/generated/`, `prisma/generated/`

## Contributing

Issues and PRs welcome at [github.com/GeorgiosDrivas/devlens](https://github.com/GeorgiosDrivas/devlens).
