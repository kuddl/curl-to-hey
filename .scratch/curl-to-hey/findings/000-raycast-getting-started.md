---
label: wayfinder:research-finding
source: https://developers.raycast.com/~gitbook/mcp (getPage / searchDocumentation tools)
pages:
  - https://developers.raycast.com/basics/getting-started
  - https://developers.raycast.com/basics/create-your-first-extension
---

# Raycast extension hints (from the official docs, via the Raycast docs MCP)

Retrieved with the MCP server `developers.raycast.com/~gitbook/mcp` (tools: `getPage`).

## Requirements (getting-started)

- Raycast 1.26.0 or higher.
- Node.js 22.14 or higher (local machine currently has Node LTS via mise; verify version in ticket 005).
- npm 7 or higher.
- Familiarity with React and TypeScript.
- Sign in to Raycast to use the extension development commands: Store, Create Extension, Import Extension, Manage Extensions.

## Create and run (create-your-first-extension)

1. In Raycast, open the **Create Extension** command, name it, pick a template (for example "Detail" for the hello-world sample), and choose a parent folder.
2. A private extension requires selecting your organization in the first dropdown. This needs a logged-in Raycast account that belongs to an organization. Open question for ticket 005: whether this repo needs a private (org) extension or a plain local one works for the no-publish goal.
3. In the terminal, in the extension directory: `npm install && npm run dev`.
4. The extension appears in Raycast root search. Edit `src/index.tsx` and save; reopen the command to see changes.
5. `npm run dev` runs development mode with hot reload and error reporting. Stop it with Ctrl+C. The extension stays installed.

## Notes for this project

- Use a **view** command (form/list/detail) with a text area for the curl input. Confirm the exact component names in ticket 004 with the docs.
- `npm run dev` is the local workflow; nothing needs publishing.
- The docs MCP is for the AI agent to use while building. It is not part of the extension.
