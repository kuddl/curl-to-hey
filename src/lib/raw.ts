/**
 * Raw HTTP requests as HTTPie or similar tools export them:
 *
 *   GET /v1/x?y=1 HTTP/1.1
 *   Authorization: Bearer ...
 *   Host: example.com
 *
 *   optional body
 *
 * They are translated into an equivalent curl command. The normal curl conversion then does the rest.
 */

/** Request line at the start of the input, e.g. `GET /x?y=1 HTTP/1.1`. */
const REQUEST_START = /^([A-Za-z]+)\s+(\S+)\s+HTTP\/\d(?:\.\d)?(?=\s|$)/;

/**
 * A header starts after whitespace with `Name: `. Used only when the input has no line breaks,
 * because Raycast's search field turns pasted newlines into spaces.
 */
const HEADER_START = /\s+(?=[A-Za-z][A-Za-z0-9-]*:\s)/;

export function isRawRequest(input: string): boolean {
  return REQUEST_START.test(input.trim());
}

export interface RawResult {
  curl: string;
  /** True when the raw request has no scheme, so https was assumed. */
  assumedScheme: boolean;
}

function shellQuote(arg: string): string {
  if (/^[A-Za-z0-9_/:=.,@%+-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

export function rawToCurl(input: string): RawResult {
  const trimmed = input.trim();
  const start = trimmed.match(REQUEST_START);
  const method = start?.[1] ?? "GET";
  const target = start?.[2] ?? "/";

  let headerLines: string[];
  let body: string;
  if (/\r?\n/.test(trimmed)) {
    const [, ...rest] = trimmed.split(/\r?\n/);
    const blank = rest.findIndex((line) => line.trim() === "");
    headerLines = blank === -1 ? rest : rest.slice(0, blank);
    body = blank === -1 ? "" : rest.slice(blank + 1).join("\n");
  } else {
    // Single line (pasted into the search field): headers are split by their `Name: ` prefix.
    // A body cannot be separated reliably here, so it is not supported in this form.
    const remainder = trimmed.slice(start?.[0].length ?? 0);
    headerLines = remainder.split(HEADER_START).filter((line) => line.trim() !== "");
    body = "";
  }

  let host: string | undefined;
  let userAgent: string | undefined;
  const headers: string[] = [];

  for (const line of headerLines) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const name = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    const lower = name.toLowerCase();

    if (lower === "host") {
      host = value; // used for the URL below
    } else if (lower === "user-agent") {
      userAgent = value; // becomes -A, which the converter maps to hey -U
    } else if (lower === "content-length") {
      // hey computes this itself.
    } else {
      headers.push(`${name}: ${value}`);
    }
  }

  let url: string;
  let assumedScheme = false;
  if (/^https?:\/\//i.test(target)) {
    url = target;
  } else {
    if (!host) {
      throw new Error("Kein Host-Header gefunden. Ohne Host lässt sich keine URL bauen.");
    }
    url = `https://${host}${target}`;
    assumedScheme = true;
  }

  const parts = ["curl"];
  if (method.toUpperCase() !== "GET" || body !== "") parts.push("-X", method);
  for (const header of headers) parts.push("-H", header);
  if (userAgent !== undefined) parts.push("-A", userAgent);
  if (body !== "") parts.push("--data-binary", body);
  parts.push(url);

  return { curl: parts.map(shellQuote).join(" "), assumedScheme };
}
