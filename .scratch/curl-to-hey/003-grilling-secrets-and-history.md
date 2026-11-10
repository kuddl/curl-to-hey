---
label: wayfinder:grilling
status: closed
type: HITL
blocked-by: []
assignee: tsaile01
---

# 003 Grilling: secret masking and history

## Resolution

- **Secrets:** the `Authorization` header (any scheme), the password in `-u user:pass`, and `Cookie`/`Set-Cookie` values. Query-string and body fields are not parsed or masked (out of scope for now).
- **Masking:** keep the scheme and the last 4 characters (`Authorization: Bearer ****x9Qz`). Values of 8 characters or fewer are fully masked as `****`. `-u` passwords use the same format. Stored history is always masked. On screen, output is masked by default, with a reveal action for the full command.
- **History:** keep the last 10 conversions by default. The limit is a Raycast preference. Plain JSON in the extension's support directory, masked values only.
- **Recording:** each successful conversion is recorded automatically. The oldest entry is dropped beyond the limit. This supersedes the earlier note that history is not written during conversion.

## Question

Decide the rules for secrets and history:

- Which inputs count as secrets: `Authorization` header (Bearer/Basic/other), `-u` password, cookies, and tokens in query strings or `--data` bodies?
- Masking format for stored history (for example `Bearer ****abcd`), and whether a reveal toggle exists for the on-screen output.
- History size: default 10, configured where (Raycast preferences)? Is the history file in the extension's support directory, and is it plain JSON?
- Confirm: nothing is persisted unmasked, and the history file is not written during the conversion itself.
