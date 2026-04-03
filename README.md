# devlens

CLI tool that scans your project and generates metadata (routes, API endpoints, env variables).

## Usage

Run in your project root:

npx @georgios-drivas/devlens

## Output

Generates:

.devlens/devlens.json

## What it does

- Detects framework (Next.js, React)
- Finds routes and API endpoints
- Analyzes environment variables:
  - used
  - unused
  - missing

## Install (optional)

Global:

npm install -g @georgios-drivas/devlens
devlens

Local:

npm install @georgios-drivas/devlens
npx @georgios-drivas/devlens
