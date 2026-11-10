---
label: wayfinder:prototype
status: closed
type: HITL
blocked-by: [002-grilling-flag-mapping.md, 003-grilling-secrets-and-history.md]
assignee: tsaile01
---

# 004 Prototype: extension UI and actions

## Question

What should the Raycast view look like and which actions does it offer in iteration 1?

Working proposal to react to:

- Input: a multi-line text field for the pasted curl command.
- Output: the generated `hey` command, with secrets masked by default.
- Actions: Enter copies the command, Cmd+Enter copies with secrets revealed, plus a "show ignored flags" view.
- Follow-up actions ("save this", "favourite") are deferred to after iteration 1.

## Resolution

- Enter copies the masked command. ⌘⏎ copies with secrets revealed. ⌘⇧R toggles the on-screen reveal.
- The "not converted" list sits under the result in the detail panel. No separate view.
- Implemented directly as a List view (`src/curl2hey.tsx`) without a separate throwaway prototype.
