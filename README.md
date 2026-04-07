# devlens

> CLI tool that scans your project and generates an agent-friendly JSON manifest of your structure, entrypoints, stack, and environment.

**devlens** automatically analyzes your codebase and produces detailed metadata about your project's architecture, routes, API endpoints, configuration files, npm scripts, and environment variables. Perfect for documentation, tooling integration, and AI-driven development workflows.

## Features

- **Framework Detection** - Automatically identifies Next.js, React, and other frameworks
- **Route Detection** - Finds API routes (Next.js app/pages) and Express routes
- **Architecture Analysis** - Supports Feature-Sliced Design (FSD) and common patterns
- **Entrypoint Discovery** - Locates frontend, backend, router, and server entrypoints
- **Environment Analysis** - Identifies used, unused, and missing environment variables
- **Config File Scanning** - Detects all major config files (tsconfig, vite, webpack, etc.)
- **Script Detection** - Extracts npm scripts with intelligent ordering

## Installation

### Global (CLI anywhere)

```bash
npm install -g @georgios-drivas/devlens
@georgios-drivas/devlens
```

### Local (per project)

```bash
npm install --save-dev @georgios-drivas/devlens
npx @georgios-drivas/devlens
```

### Via npx (no installation)

```bash
npx @georgios-drivas/devlens
```

## Usage

Run devlens in your project root:

```bash
@georgios-drivas/devlens
```

### Flags

- `--json` - Print JSON output to stdout
- `--out <file>` - Write manifest to custom file path (default: `project-structure.json`)
- `--help, -h` - Show help message

### Examples

```bash
# Generate project-structure.json in current directory
devlens

# Print JSON output to console
devlens --json

# Save to custom file
devlens --out metadata.json
```

## Output Structure

The generated manifest includes:

### Core Metadata

```json
{
  "tool": "devlens",
  "schemaVersion": 2,
  "generatedAt": "2026-04-06T12:00:00.000Z",
  "project": {
    "name": "my-app",
    "root": "."
  }
}
```

### Framework Detection

```json
{
  "framework": {
    "name": "react",
    "confidence": 0.91,
    "evidence": ["package.json dependency: react", "React entry file found"]
  }
}
```

- **name** - Detected framework (nextjs, react, unknown)
- **confidence** - Confidence score (0-1)
- **evidence** - List of findings that led to this detection

### Architecture Analysis

```json
{
  "structure": {
    "architecture": "fsd",
    "directories": {
      "app": "src/app",
      "pages": "src/pages",
      "features": "src/features",
      "entities": "src/entities",
      "shared": "src/shared"
    }
  }
}
```

- **architecture** - Pattern detected (fsd, unknown)
- **directories** - Found directories with their paths

### Entrypoints

```json
{
  "entrypoints": {
    "frontend": ["src/main.tsx"],
    "app": ["src/App.tsx"],
    "router": ["src/app/router.tsx"],
    "server": ["src/server/index.ts"]
  }
}
```

### API Routes

```json
{
  "api": {
    "type": "next-api",
    "routes": [
      {
        "path": "/api/users",
        "file": "src/app/api/users/route.ts",
        "methods": ["GET", "POST"]
      }
    ]
  }
}
```

### Environment Variables

```json
{
  "env": {
    "used": [
      {
        "name": "DATABASE_URL",
        "files": ["src/lib/db.ts", "src/api/users.ts"]
      }
    ],
    "unused": [
      {
        "name": "LEGACY_API_KEY",
        "declaredIn": [".env"]
      }
    ],
    "missing": [
      {
        "name": "STRIPE_API_KEY",
        "referencedIn": ["src/payments.ts"]
      }
    ]
  }
}
```

- **used** - Variables declared and referenced
- **unused** - Declared but never referenced
- **missing** - Referenced but not declared

### Configuration Files

```json
{
  "configFiles": [
    "package.json",
    "tsconfig.json",
    "vite.config.ts",
    "tailwind.config.js"
  ]
}
```

### NPM Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  }
}
```

## Supported Frameworks

- **Next.js** - Full detection with app/pages directory support
- **React** - Detection with Vite, Create React App, or custom setups
- **Other frameworks** - Basic detection with unknown confidence

### Ignored Directories

By default, these are skipped:

- node_modules, .git, .next, dist, build, coverage, .turbo, .vercel

### Ignored Path Segments

- `generated/`, `src/generated/`, `prisma/generated/`

## Use Cases

- **AI Development** - Provide context to LLMs about your project structure
- **Tooling** - Build tools that understand your project layout
- **Auditing** - Find unused env variables and missing configurations

## Example Output File

```bash
$ devlens
Written /path/to/project/project-structure.json
```

Full example JSON (excerpt):

```json
{
  "tool": "devlens",
  "schemaVersion": 2,
  "generatedAt": "2026-04-06T12:34:56.789Z",
  "project": {
    "name": "@georgios-drivas/my-app",
    "root": "."
  },
  "framework": {
    "name": "nextjs",
    "confidence": 0.98,
    "evidence": ["package.json dependency: next"]
  },
  "structure": {
    "architecture": "fsd",
    "directories": {
      "app": "src/app",
      "pages": "src/pages",
      "features": "src/features",
      "entities": "src/entities",
      "shared": "src/shared"
    }
  },
  "entrypoints": {
    "router": ["src/app", "src/pages"]
  },
  "configFiles": ["package.json", "tsconfig.json", "next.config.js"],
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "api": {
    "type": "next-api",
    "routes": [
      {
        "path": "/api/hello",
        "file": "src/app/api/hello/route.ts",
        "methods": ["GET", "POST"]
      }
    ]
  }
}
```

## Contributing

Contributions welcome! Please feel free to submit issues and pull requests at [github.com/GeorgiosDrivas/devlens](https://github.com/GeorgiosDrivas/devlens).
