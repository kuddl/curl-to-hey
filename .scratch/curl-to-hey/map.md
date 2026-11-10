---
label: wayfinder:map
status: open
---

# curl-to-hey (map)

## Destination

A private, locally-run Raycast extension, built in this repo, that converts a pasted curl command into an equivalent `hey` load-test command (never published to the Raycast store). All conversion is local code: no AI, no network calls, no external service. The repo also includes a getting-started page that tells an AI agent how to use the existing Raycast documentation MCP server when it works on this extension. We are not building an MCP server.

## Notes

- **Domain:** converting curl (HTTP client) invocations into `hey` (HTTP load generator) invocations. `hey` is installed at `/opt/homebrew/bin/hey`.
- **Skills every session should consult:** `grilling`, `domain-modeling`, `prototype` (for UI questions), `research` (for `hey` facts).
- **Raycast docs:** use the Raycast docs MCP (`https://developers.raycast.com/~gitbook/mcp`, tools `getPage`, `searchDocumentation`) for API questions. Hints so far: `findings/000-raycast-getting-started.md`.
- **Standing preferences:**
  - Convert as much of curl as `hey` can express. Anything not translated is listed in the output as ignored, never silently dropped.
  - Bearer tokens and other secrets: shown once on screen, masked in stored history, never persisted in plaintext.
  - History: store the last N commands (N configurable, default 10), masked.
  - Tickets are local markdown files in `.scratch/<map>/`.
  - Only local processing. Do not add any code path that calls out to an AI model or remote service.

## Decisions so far

<!-- one line per closed ticket: gist, then link -->

- [001 Research: hey flags vs curl flags](001-research-hey-flags.md) — hey 0.1.5 `-a` is broken (use a Basic header); curl `-A` maps to hey `-U`; `-d` needs `-m POST`; `-X`, `-k`, `-o` have no hey equivalent. Details in `findings/001-hey-flags.md`.
- [002 Grilling: curl→hey flag mapping](002-grilling-flag-mapping.md) — string-only conversion; `-u` → Basic header; `-d` implies POST unless `-X`; `-A` → `-U`; `--json` and `-G` are converted; exact, approximate, and ignored flags are reported in three tiers.
- [005 Task: Raycast dev setup](005-task-raycast-dev-setup.md) — local (non-organization) extension; Node 24, Raycast 2.10.1; the extension lives at the repo root (moved from the `curl2hey` scratch project).
- [004 Prototype: extension UI](004-prototype-extension-ui.md) — umgesetzt ohne separaten Prototyp: Eingabe im Suchfeld, Ergebnis mit Detail-Panel, Enter kopiert maskiert, ⌘⏎ mit Geheimnissen, ⌘⇧R zeigt Geheimnisse an, "Nicht übernommen" unter dem Ergebnis; Verlauf unter der Eingabe. Standard-Lastparameter: keine (hey-Defaults). `-d @datei` wird als ignoriert gemeldet. Kein Shell-Parsing über Anführungszeichen und Zeilenfortsetzungen hinaus.
- Raw-Requests (HTTPie-Export) werden zusätzlich zu curl akzeptiert und in curl übersetzt. Einzeilige Eingabe wird unterstützt, weil die Suchleiste Zeilenumbrüche entfernt. Bodies in einzeiliger Form sind nicht unterstützt. Offen: mehrzeiliges Eingabefeld (würde die Tastenbelegung ändern).
- [003 Grilling: secrets and history](003-grilling-secrets-and-history.md) — mask the Authorization, `-u`, and cookie values (scheme + last 4 chars, short values fully masked); keep the last 10 conversions automatically, masked, in a plain JSON file.

## Not yet specified

- Multi-line input (TextArea) for raw bodies and Cmd+Enter conflict. Decide before changing the input UI.
- Nothing else blocking. Getting-started page is done (`GETTING-STARTED.md`). Default load parameters are decided: none emitted.


- **Follow-up actions:** "save this" and "favourite" beyond the first iteration. Revisit after iteration 1.


## Out of scope

- Publishing to the Raycast extension store.
- Any AI-based or remote conversion.
- Building an MCP server. The agent consumes the existing Raycast documentation MCP server; we only document how to use it.
- Executing the generated `hey` command from inside the extension, unless a later decision adds it.
