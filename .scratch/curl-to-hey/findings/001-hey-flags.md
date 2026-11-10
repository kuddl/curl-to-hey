---
label: wayfinder:research-finding
ticket: 001-research-hey-flags.md
hey: 0.1.5 (Homebrew, /opt/homebrew/bin/hey -> Cellar/hey/0.1.5)
curl: /usr/bin/curl 8.7.1
---

# hey flags vs curl flags

## Sources and method

- hey README: https://raw.githubusercontent.com/rakyll/hey/master/README.md (fetched). Its option list is the same as the local `hey -h`, except the local binary also has `-U` (User-Agent) and `-cpus`.
- hey source `main.go`: the GitHub raw URL returned no content (both `master` and `v0.1.5`), so flag behavior comes from **measurement**, not source.
- Measurement: a local echo server on `127.0.0.1:8765` logged every request hey sent (method, headers, body). No external network was used.
- curl semantics: from the curl manual (`man curl`) and common curl behavior. Not measured here.

## hey flags (measured on 0.1.5)

| hey flag | Observed behavior |
|---|---|
| `-m METHOD` | Sets the method (verified with POST). |
| `-H "K: V"` | Adds the header (verified with `Authorization`). Repeatable. |
| `-d BODY` | Sends the body. **Without `-m`, the method stays GET** (verified: GET with body). |
| `-D FILE` | Body from file (not tested). |
| `-T TYPE` | Sets Content-Type. Default `text/html`, even for GET (verified). |
| `-A ACCEPT` | Sets the **Accept** header (verified). |
| `-U UA` | Sets User-Agent; the value is combined with `hey/0.0.1`, e.g. `myagent hey/0.0.1` (verified). |
| `-a user:pass` | **Does not send an Authorization header in 0.1.5** (verified for GET and POST). Do not rely on it. |
| `-host HOST` | Sets the Host header (verified). |
| `-disable-compression` | Removes `Accept-Encoding` (verified). |
| `-disable-keepalive` | Sends `Connection: close` (verified). |
| `-disable-redirects` | Accepted (no redirect target tested). |
| `-h2` | Enables HTTP/2 (in help and README; not tested). |
| `-x host:port` | HTTP proxy (in help and README; not tested). |
| `-t SECONDS` | Per-request timeout, default 20, 0 = infinite (help text). |
| `-n`, `-c`, `-q`, `-z` | Load shape. Not part of curl; set by the extension, not converted. |
| `-o csv` | Output format for the load report. No curl equivalent (curl `-o` writes the response body to a file). |
| `-X` | **Not defined in hey** (verified: exit 2). Use `-m`. |
| `-allow-insecure`, `-k` | **Not defined in hey** (verified: exit 2 for `-allow-insecure`). No way to skip TLS verification found. |

## curl flags → hey mapping (proposal for ticket 002)

| curl flag | hey equivalent | Notes |
|---|---|---|
| `-X METHOD`, `--request` | `-m METHOD` | Direct. |
| `-H "K: V"`, `--header` | `-H "K: V"` | Direct. |
| `-d`, `--data`, `--data-raw`, `--data-binary` | `-d BODY` + `-m POST` | curl implies POST when `-d` is given without `-X`. hey does not, so the converter must add `-m POST` when the method is not set. `@file` is `-D FILE`. |
| `--json` | `-d` + `-H "Content-Type: application/json"` + `-H "Accept: application/json"` + `-m POST` | curl `--json` sets both headers and POST. Use `-H` for Content-Type, since `-T` sets only the type. |
| `-G`, `--get` | none directly | Move `-d` data into the URL query string, then use GET. Doable in the converter. |
| `-u user:pass` | `-H "Authorization: Basic <base64>"` | **Do not use `-a`** (broken in 0.1.5). Base64-encode in the converter (local). |
| `--url` | URL argument | Direct. |
| `-k`, `--insecure` | none | Cannot be expressed. Report as ignored. |
| `--compressed` | default hey behavior | hey already sends `Accept-Encoding: gzip`. Map to nothing, or report as no-op. |
| `-L`, `--location` | default hey behavior | hey follows redirects by default. Map to nothing. |
| `--max-time SECONDS` | `-t SECONDS` | Approximate: hey's timeout is per request, curl's is total. Report caveat. |
| `-A UA`, `--user-agent` | `-U UA` | **Name clash:** curl `-A` is User-Agent, hey `-A` is Accept. The converter must map curl `-A` to `-U`. |
| `-e REFERER` | `-H "Referer: ..."` | Via header. |
| `-b COOKIE` | `-H "Cookie: ..."` | Via header. |
| `-x PROXY` | `-x host:port` | hey takes host:port only (no scheme). Strip `http://`, report otherwise. |
| `-I`, `--head` | `-m HEAD` | Direct. |
| `-o FILE` | none | curl writes the body to a file; hey's `-o` is the report format. Report as ignored, never map. |
| `--http2` | `-h2` | Direct. |
| `-s`, `-v`, `-i`, `-S` | none | Display-only flags. Report as ignored. |
| `--cookie-jar`, `-c` (curl) | none | Report as ignored. |

## Implications for ticket 002

1. curl's `-A` must map to hey's `-U`, not `-A`.
2. `-d` implies `-m POST` when no method is given.
3. `-u` must be converted to a Basic `Authorization` header, not `-a`.
4. `-k` and `-o` are not translatable; list them as ignored.
5. `-T` (hey) only sets Content-Type, so `--json` should use `-H` for both headers.
