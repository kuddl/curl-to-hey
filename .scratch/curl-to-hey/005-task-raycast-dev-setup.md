---
label: wayfinder:task
status: closed
type: HITL
blocked-by: []
assignee: tsaile01
---

# 005 Task: confirm Raycast dev setup

## Context

See `findings/000-raycast-getting-started.md` for the official steps (Create Extension command, `npm install && npm run dev`).

## Resolution

- **Node** v24.19.0, **npm** 11.17.0 (requirements: Node 22.14+, npm 7+). **Raycast** 2.10.1 (requirement: 1.26.0+).
- **Extension type:** local, not organization-based. Publishing is not needed.
- **Hello World check:** passed (`npm run dev` loaded the command in Raycast, screenshot taken).
- **Location:** variant A. The extension lives at the repo root of `curl-to-hey`. The scratch project `curl2hey` (name `curl2hey`, view command `curl2hey`) was moved here. Its own `.git` (no commits) was removed. `.gitignore` merged. `npm install` run. `npx tsc --noEmit` passes.
- **Follow-up:** the old scratch path `raycast_extensions/curl2hey` no longer exists. Raycast should load only the repo-root version. Verify in Raycast after the next `npm run dev`.

## Question

Make sure the local Raycast development toolchain works before any build begins, and record what was done.

Checklist for the human:

- [ ] Raycast is installed and the developer features are enabled.
- [ ] `node` and `npm` run (currently `node` from mise LTS, `npm` available).
- [ ] Decide the extension scaffold: `npx create-raycast-extension` (or equivalent), run inside this repo, and whether to keep the Raycast-generated `package.json` at repo root or in a subfolder.
- [ ] Confirm `npm run dev` loads the extension into Raycast locally.
- [ ] Decide whether the extension must be created as a private (organization) extension, given the docs say that option needs a Raycast organization. Plain local development should be enough for the no-publish goal.

Answer records: the Node version, Raycast version, and the chosen scaffold location.
