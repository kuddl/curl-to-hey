import { tokenize } from "./tokenize.ts";
import { maskHeader } from "./mask.ts";
import { isRawRequest, rawToCurl } from "./raw.ts";

export interface HeyArg {
  flag: string;
  value?: string;
}

export interface Note {
  kind: "ignored" | "warning";
  text: string;
}

export interface Conversion {
  method: string;
  url: string;
  args: HeyArg[];
  notes: Note[];
}

export class ConversionError extends Error {}

const HEY_METHODS = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"];

/** curl short options that take a value. */
const SHORT_WITH_VALUE = new Set([
  "X",
  "H",
  "d",
  "u",
  "A",
  "e",
  "b",
  "x",
  "m",
  "o",
  "c",
  "T",
  "F",
  "w",
  "K",
  "C",
  "r",
  "E",
  "Y",
  "y",
  "z",
  "P",
  "Q",
  "t",
]);

/** curl long options that take a value. */
const LONG_WITH_VALUE = new Set([
  "--request",
  "--header",
  "--data",
  "--data-raw",
  "--data-binary",
  "--data-ascii",
  "--data-urlencode",
  "--json",
  "--user",
  "--url",
  "--user-agent",
  "--referer",
  "--cookie",
  "--proxy",
  "--max-time",
  "--oauth2-bearer",
  "--output",
  "--cookie-jar",
  "--upload-file",
  "--form",
  "--write-out",
  "--connect-timeout",
  "--config",
  "--cert",
  "--cacert",
  "--resolve",
  "--limit-rate",
  "--retry",
  "--range",
  "--time-cond",
  "--stderr",
  "--trace",
  "--trace-ascii",
  "--netrc-file",
  "--interface",
  "--proto",
]);

/** One normalized curl option, e.g. `-X POST` or `--header "K: V"`. */
interface Option {
  name: string;
  value?: string;
}

/** Splits tokens into normalized options and positional arguments (URL candidates). */
function readOptions(tokens: string[]): { options: Option[]; positionals: string[] } {
  const options: Option[] = [];
  const positionals: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === "--") {
      positionals.push(...tokens.slice(i + 1));
      break;
    }

    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      const name = eq === -1 ? token : token.slice(0, eq);
      if (LONG_WITH_VALUE.has(name)) {
        options.push({ name, value: eq === -1 ? (tokens[++i] ?? "") : token.slice(eq + 1) });
      } else {
        options.push({ name });
      }
      continue;
    }

    if (token.startsWith("-") && token.length > 1) {
      // Combined short flags (-sSL) and attached values (-XPOST, -H"K: V").
      for (let j = 1; j < token.length; j++) {
        const letter = token[j];
        const name = `-${letter}`;
        if (SHORT_WITH_VALUE.has(letter)) {
          const attached = token.slice(j + 1);
          options.push({ name, value: attached.length > 0 ? attached : (tokens[++i] ?? "") });
          break;
        }
        options.push({ name });
      }
      continue;
    }

    positionals.push(token);
  }

  return { options, positionals };
}

/** Header names are case-insensitive. */
function hasHeader(headers: string[], name: string): boolean {
  const target = name.toLowerCase();
  return headers.some((h) => {
    const colon = h.indexOf(":");
    return colon !== -1 && h.slice(0, colon).trim().toLowerCase() === target;
  });
}

/** Converts one curl command string into a hey invocation. Pure: no network, no file access. */
export function convertCurl(input: string): Conversion {
  const tokens = tokenize(input.trim());
  if (tokens[0] === "curl") tokens.shift();

  const { options, positionals } = readOptions(tokens);
  const notes: Note[] = [];
  const ignored = (text: string) => notes.push({ kind: "ignored", text });
  const warning = (text: string) => notes.push({ kind: "warning", text });

  let explicitMethod: string | undefined;
  let head = false;
  let get = false;
  let insecure = false;
  let noKeepalive = false;
  let http2 = false;
  let userAuth: string | undefined;
  let bearer: string | undefined;
  let userAgent: string | undefined;
  let referer: string | undefined;
  let cookie: string | undefined;
  let proxy: string | undefined;
  let maxTime: string | undefined;
  let json: string | undefined;
  let url: string | undefined;
  const dataParts: string[] = [];
  const headers: string[] = [];

  for (const { name, value = "" } of options) {
    switch (name) {
      case "-X":
      case "--request":
        explicitMethod = value.toUpperCase();
        break;
      case "-H":
      case "--header":
        headers.push(value);
        break;
      case "-d":
      case "--data":
      case "--data-raw":
      case "--data-binary":
      case "--data-ascii":
        if (value.startsWith("@")) {
          ignored(`${name} ${value}: Dateiinhalt wird nicht gelesen, nicht übernommen.`);
        } else {
          dataParts.push(value);
        }
        break;
      case "--json":
        json = value;
        break;
      case "-u":
      case "--user":
        if (value.includes(":")) {
          userAuth = value;
        } else {
          ignored(`-u ${value}: ohne Passwort nicht übernommen. Schreibe user:pass explizit.`);
        }
        break;
      case "--oauth2-bearer":
        bearer = value;
        break;
      case "--url":
        url ??= value;
        break;
      case "-A":
      case "--user-agent":
        userAgent = value;
        break;
      case "-e":
      case "--referer":
        referer = value;
        break;
      case "-b":
      case "--cookie":
        if (value.includes("=")) {
          cookie = value;
        } else {
          ignored(`-b ${value}: Cookie-Datei wird nicht gelesen, nicht übernommen.`);
        }
        break;
      case "-x":
      case "--proxy":
        proxy = value;
        break;
      case "-m":
      case "--max-time":
        maxTime = value;
        break;
      case "-I":
      case "--head":
        head = true;
        break;
      case "-G":
      case "--get":
        get = true;
        break;
      case "--http2":
        http2 = true;
        break;
      case "--no-keepalive":
        noKeepalive = true;
        break;
      case "-k":
      case "--insecure":
        insecure = true;
        break;
      case "--compressed":
      case "-L":
      case "--location":
        // Exact no-op: hey already sends Accept-Encoding and follows redirects.
        break;
      default:
        ignored(`${value === undefined ? name : `${name} ${value}`}: hey kann das nicht, nicht übernommen.`);
    }
  }

  if (url === undefined) url = positionals.shift();
  if (positionals.length > 0) {
    ignored(`Zusätzliche Argumente nicht übernommen: ${positionals.join(" ")}`);
  }
  if (!url) {
    throw new ConversionError("Keine URL gefunden.");
  }

  // Body: --json wins over -d. Multiple -d are joined with & (as curl does).
  let body: string | undefined;
  if (json !== undefined) body = json;
  else if (dataParts.length > 0) body = dataParts.join("&");

  // -G moves the data into the query string.
  if (get && body !== undefined) {
    url += `${url.includes("?") ? "&" : "?"}${body}`;
    body = undefined;
  }

  // Method: explicit -X wins, then -I / -G, then implied POST for a body.
  let method: string;
  if (explicitMethod) method = explicitMethod;
  else if (head) method = "HEAD";
  else if (get) method = "GET";
  else if (body !== undefined) method = "POST";
  else method = "GET";

  if (!HEY_METHODS.includes(method)) {
    warning(
      `Methode ${method} steht nicht in der hey-Hilfe. Sie wird trotzdem übergeben; ob hey sie akzeptiert, ist ungeprüft.`,
    );
  }

  // Headers: explicit -H first; generated headers never override an explicit one.
  const allHeaders = [...headers];
  if (!hasHeader(allHeaders, "authorization")) {
    if (userAuth !== undefined) {
      allHeaders.push(`Authorization: Basic ${Buffer.from(userAuth).toString("base64")}`);
    } else if (bearer !== undefined) {
      allHeaders.push(`Authorization: Bearer ${bearer}`);
    }
  }
  if (cookie !== undefined) allHeaders.push(`Cookie: ${cookie}`);
  if (referer !== undefined) allHeaders.push(`Referer: ${referer}`);
  if (json !== undefined) {
    if (!hasHeader(allHeaders, "content-type")) allHeaders.push("Content-Type: application/json");
    if (!hasHeader(allHeaders, "accept")) allHeaders.push("Accept: application/json");
  }

  const args: HeyArg[] = [];
  if (explicitMethod !== undefined || get || method !== "GET") {
    args.push({ flag: "-m", value: method });
  }
  for (const header of allHeaders) args.push({ flag: "-H", value: header });

  if (body !== undefined) {
    // curl sends application/x-www-form-urlencoded for -d by default; hey would send text/html.
    if (json === undefined && !hasHeader(allHeaders, "content-type")) {
      args.push({ flag: "-T", value: "application/x-www-form-urlencoded" });
    }
    args.push({ flag: "-d", value: body });
  }

  if (userAgent !== undefined) args.push({ flag: "-U", value: userAgent });

  if (maxTime !== undefined) {
    const seconds = Number(maxTime);
    if (Number.isFinite(seconds) && seconds > 0) {
      const rounded = Math.ceil(seconds);
      args.push({ flag: "-t", value: String(rounded) });
      warning(
        `--max-time ${maxTime} wird zu -t ${rounded}. hey begrenzt jede Anfrage einzeln, curl begrenzt die Gesamtdauer.`,
      );
    } else {
      ignored(`--max-time ${maxTime}: ungültiger Wert, nicht übernommen.`);
    }
  }

  if (proxy !== undefined) {
    const scheme = proxy.match(/^([a-z0-9]+):\/\//i)?.[1].toLowerCase();
    const hostPort = proxy.replace(/^[a-z0-9]+:\/\//i, "").replace(/\/+$/, "");
    if (scheme !== undefined && scheme !== "http" && scheme !== "https") {
      ignored(`-x ${proxy}: Proxy-Schema ${scheme} wird nicht unterstützt, nicht übernommen.`);
    } else {
      if (scheme !== undefined) warning(`-x ${proxy} wird zu -x ${hostPort}. hey nimmt nur host:port.`);
      args.push({ flag: "-x", value: hostPort });
    }
  }

  if (http2) args.push({ flag: "-h2" });
  if (noKeepalive) args.push({ flag: "-disable-keepalive" });
  if (insecure) ignored("-k: TLS-Prüfung ausschalten geht mit hey nicht, nicht übernommen.");

  return { method, url, args, notes };
}

/** Accepts either a curl command or a raw HTTP request (as HTTPie exports it). */
export function convertInput(input: string): Conversion {
  if (!isRawRequest(input)) return convertCurl(input);

  const { curl, assumedScheme } = rawToCurl(input);
  const conversion = convertCurl(curl);
  if (assumedScheme) {
    conversion.notes.unshift({
      kind: "warning",
      text: "Der Raw-Request enthält kein Schema. https wurde angenommen.",
    });
  }
  return conversion;
}

/** Quotes one argument for a POSIX shell when needed. */
function shellQuote(arg: string): string {
  if (/^[A-Za-z0-9_/:=.,@%+-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

/**
 * Renders the hey command as one line.
 * With `reveal = false`, secret headers (Authorization, Cookie) are masked.
 */
export function renderCommand(conversion: Conversion, reveal: boolean): string {
  const parts = ["hey"];
  for (const arg of conversion.args) {
    parts.push(arg.flag);
    if (arg.value !== undefined) {
      const value = arg.flag === "-H" && !reveal ? maskHeader(arg.value) : arg.value;
      parts.push(shellQuote(value));
    }
  }
  parts.push(shellQuote(conversion.url));
  return parts.join(" ");
}
