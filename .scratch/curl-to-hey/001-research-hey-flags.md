---
label: wayfinder:research
status: closed
type: AFK
blocked-by: []
assignee: tsaile01
---

# 001 Research: which curl flags map onto hey

## Resolution

Done inline (no background agent in this session). Findings in `findings/001-hey-flags.md`. Key results:

- `-a` in hey 0.1.5 sends no Authorization header. Convert curl `-u` to a Basic `Authorization` header.
- `-d` without `-m` stays GET in hey. Converter must add `-m POST`.
- curl `-A` (User-Agent) maps to hey `-U`. hey `-A` is Accept.
- hey has no `-X`, no insecure/TLS-skip flag, and no `-o` equivalent. These are reported as ignored.

## Question

Which curl flags have a faithful equivalent in `hey`, which only partly map, and which have no equivalent? Build a table covering at least: `-X`, `-H`, `-d`/`--data*`, `--data-binary`, `--json`, `-G`, `-u`, `--url`, `-k`, `--compressed`, `-L`, `-A`, `-e`, `-b`, `-x`, `--max-time`, `-o`, `-I`.

## Context pointer

- Primary sources: `https://github.com/rakyll/hey` README and the `hey -h` output on this machine (`/opt/homebrew/bin/hey`, version to be recorded).
- Local curl reference: `man curl` (`/usr/bin/curl`).
- Output: a findings file at `.scratch/curl-to-hey/findings/001-hey-flags.md` (on a throwaway `research/001-hey-flags` branch per the research skill).
