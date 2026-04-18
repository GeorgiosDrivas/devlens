# devlens

> Generate a single JSON file that gives any AI agent an accurate picture of your project.

When you drop an agent into an unfamiliar codebase, it wastes context figuring out the basics — what package manager is in use, where the entry files are, which env vars are missing, what tools are configured. **devlens** scans your project once and produces a concise, structured manifest so agents can skip that discovery phase entirely.

## Installation

```bash
# No install needed
npx @georgios-drivas/devlens

# Or globally
npm install -g @georgios-drivas/devlens
```

## Usage

Run in your project root:

```bash
devlens                        # writes project-structure.json
devlens --json                 # prints to stdout
devlens --out context.json     # custom output path
devlens --help
```

Commit `project-structure.json` alongside your code, or generate it on-the-fly and pipe it into your agent's context. Either works.

## Output

```json
{
  "tool": "devlens",
  "schemaVersion": 3,
  "generatedAt": "2026-04-18T10:00:00.000Z",
  "project": {
    "name": "my-app",
    "root": "."
  },
  "runtime": {
    "packageManager": "pnpm",
    "moduleSystem": "esm",
    "languageHints": ["typescript"],
    "workspace": false
  },
  "filesystem": {
    "topLevelDirectories": ["public", "scripts", "src"]
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
    "files": ["package.json", "tsconfig.json", "vite.config.ts"],
    "tools": ["eslint", "typescript", "vite", "vitest"]
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

**`runtime`** — How to install dependencies and run the project. `languageHints` signals whether to expect `.ts` files and type errors. `workspace` flags a monorepo root.

**`filesystem.topLevelDirectories`** — A quick orientation of the repo layout without listing every file.

**`dependencies.categories`** — Pre-bucketed into `ui`, `server`, and `testing` so an agent can reason about the stack without parsing all deps itself.

**`config.tools`** — The active toolchain: typescript, vite, vitest, eslint, prettier. Tells an agent which configs exist and what commands are valid.

**`environment`** — The most immediately actionable section. `missing` lists every env var referenced in code but absent from any `.env` file — a common source of runtime failures an agent should flag or fix before doing anything else. `unused` surfaces declared vars that are never read.

**`source`** — Four booleans that answer common agent questions up front: is there a containerization setup, a CLI entry, a test suite, a CI pipeline?

## Ignored by default

Directories: `node_modules`, `.git`, `.next`, `dist`, `build`, `coverage`, `.turbo`, `.vercel`, `out`

Path segments: `generated/`, `src/generated/`, `prisma/generated/`

## Contributing

Issues and PRs welcome at [github.com/GeorgiosDrivas/devlens](https://github.com/GeorgiosDrivas/devlens).
