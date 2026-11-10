/**
 * Splits a single curl command string into argv-like tokens.
 *
 * Deliberately minimal: whitespace separates tokens, single quotes are literal,
 * double quotes allow \" and \\ escapes, a backslash escapes the next character
 * outside quotes, and backslash-newline continues the line. No shell expansion.
 */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let hasToken = false;
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (quote === "'") {
      if (ch === "'") quote = null;
      else current += ch;
      continue;
    }

    if (quote === '"') {
      if (ch === '"') {
        quote = null;
      } else if (ch === "\\" && (input[i + 1] === '"' || input[i + 1] === "\\")) {
        current += input[i + 1];
        i++;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === "\\") {
      const next = input[i + 1];
      if (next === "\n") {
        i++;
        continue;
      }
      if (next === "\r" && input[i + 2] === "\n") {
        i += 2;
        continue;
      }
      if (next !== undefined) {
        current += next;
        hasToken = true;
        i++;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      hasToken = true;
      continue;
    }

    if (/\s/.test(ch)) {
      if (hasToken) {
        tokens.push(current);
        current = "";
        hasToken = false;
      }
      continue;
    }

    current += ch;
    hasToken = true;
  }

  if (quote) {
    throw new Error("Ein Anführungszeichen ist nicht geschlossen.");
  }
  if (hasToken) tokens.push(current);
  return tokens;
}
