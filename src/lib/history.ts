import { environment } from "@raycast/api";
import { promises as fs } from "fs";
import path from "path";

/** Stored history holds masked commands only. Secrets are never written in plaintext. */
export interface HistoryEntry {
  command: string;
  createdAt: string;
}

export const DEFAULT_HISTORY_LIMIT = 10;

function historyFile(): string {
  return path.join(environment.supportPath, "history.json");
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await fs.readFile(historyFile(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/** Adds a masked command at the top. Consecutive duplicates are skipped. Oldest entries beyond `limit` are dropped. */
export async function recordHistory(maskedCommand: string, limit: number): Promise<HistoryEntry[]> {
  const current = await loadHistory();
  if (current[0]?.command === maskedCommand) return current;

  const next = [{ command: maskedCommand, createdAt: new Date().toISOString() }, ...current].slice(0, limit);
  await fs.mkdir(environment.supportPath, { recursive: true });
  await fs.writeFile(historyFile(), JSON.stringify(next, null, 2), "utf8");
  return next;
}
