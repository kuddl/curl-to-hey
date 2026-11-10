---
label: wayfinder:grilling
status: closed
type: HITL
blocked-by: [001-research-hey-flags.md]
assignee: tsaile01
---

# 002 Grilling: the curl→hey flag mapping

## Resolution

Conversion is string-only. The converter never runs curl and never probes the endpoint.

1. **`-u user:pass`** → `-H "Authorization: Basic <base64>"`, encoded locally. `-u user` with no password is unsupported: it is not converted, and the output says to write `user:pass` explicitly.
2. **`-d` and `-X`:** `-d` alone implies `-m POST`. An explicit `-X` always wins (`-X GET -d x` → `-m GET -d x`).
3. **`-A`** → `-U`. Never emitted as hey `-A`. No User-Agent is added unless the curl command has one.
4. **`--json`** → `-m POST`, `-d <body>`, `-H "Content-Type: application/json"`, `-H "Accept: application/json"`. An explicit `-H` for either header replaces the default. No `-T`.
5. **`-G`** → data appended to the URL (`?` or `&`), `-m GET`, no body.
6. **Three tiers:**
   - Exact equivalents convert silently. Examples: `-I` → `-m HEAD`, `-b` → `Cookie`, `-e` → `Referer`, `--http2` → `-h2`, and `--compressed` (hey already sends gzip, so no-op).
   - Approximations convert with a warning. Examples: `--max-time` → `-t` (per-request in hey, total in curl), `-x` with scheme stripped to host:port.
   - No equivalent is listed as ignored. Examples: `-k`, `-o`, `-v`, `-s`.
   - Only a missing URL is a hard error.
7. **Unlisted method** (not in hey's help: GET, POST, PUT, DELETE, HEAD, OPTIONS): pass through to `-m` with a warning. Not blocked, and the warning says it is not listed in hey's help rather than claiming it fails.

## Question

Given the research table from ticket 001, decide for each flag: translate, translate with a caveat, or report as ignored. Also decide the output format for ignored flags, and what happens when a curl command has no URL or uses an unsupported method.
