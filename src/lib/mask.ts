export const MASK = "****";

/** Values of 8 characters or fewer are fully masked. Otherwise the last 4 characters stay visible. */
export function maskSecret(value: string): string {
  if (value.length <= 8) return MASK;
  return `${MASK}${value.slice(-4)}`;
}

/** Keeps the auth scheme (`Bearer`, `Basic`, ...) and masks the credential after it. */
export function maskAuthValue(value: string): string {
  const match = value.match(/^(\S+)\s+(.+)$/);
  if (match) return `${match[1]} ${maskSecret(match[2])}`;
  return maskSecret(value);
}

/** Masks the value of a `Name: value` header if the header carries a secret. */
export function maskHeader(header: string): string {
  const colon = header.indexOf(":");
  if (colon === -1) return header;

  const name = header.slice(0, colon);
  const value = header.slice(colon + 1).trim();
  const lower = name.trim().toLowerCase();

  if (lower === "authorization") return `${name}: ${maskAuthValue(value)}`;
  if (lower === "cookie" || lower === "set-cookie") return `${name}: ${maskSecret(value)}`;
  return header;
}
