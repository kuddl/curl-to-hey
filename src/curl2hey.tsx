import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  getPreferenceValues,
  openCommandPreferences,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { convertInput, renderCommand, type Conversion } from "./lib/convert.ts";
import { DEFAULT_HISTORY_LIMIT, HistoryEntry, loadHistory, recordHistory } from "./lib/history.ts";

interface Preferences {
  historyLimit: string;
}

function parseLimit(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_HISTORY_LIMIT;
}

export default function Command() {
  const [input, setInput] = useState("");
  const [reveal, setReveal] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const limit = parseLimit(getPreferenceValues<Preferences>().historyLimit);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const result = useMemo(() => {
    if (!input.trim()) return null;
    try {
      const conversion = convertInput(input);
      return {
        ok: true as const,
        conversion,
        masked: renderCommand(conversion, false),
        revealed: renderCommand(conversion, true),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false as const, message };
    }
  }, [input]);

  // Record after the input settles, so partial pastes and keystrokes do not fill the history.
  const maskedCommand = result?.ok ? result.masked : undefined;
  useEffect(() => {
    if (!maskedCommand) return;
    const timer = setTimeout(() => {
      recordHistory(maskedCommand, limit).then(setHistory);
    }, 800);
    return () => clearTimeout(timer);
  }, [maskedCommand, limit]);

  const hasInput = input.trim().length > 0;

  // The search bar is single-line: pasted newlines become spaces. Raw requests therefore
  // also parse as one line (see src/lib/raw.ts). Multi-line bodies need a TextArea (open question).

  return (
    <List
      searchBarPlaceholder="curl-Befehl oder Raw-Request einfügen …"
      searchText={input}
      onSearchTextChange={setInput}
      filtering={false}
      isShowingDetail={result?.ok === true}
    >
      {result?.ok && (
        <List.Section title="Ergebnis">
          <List.Item
            id="result"
            title="hey-Befehl"
            icon={Icon.Terminal}
            detail={
              <List.Item.Detail
                markdown={resultMarkdown(result.conversion, reveal ? result.revealed : result.masked, reveal)}
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Masked" content={result.masked} />
                <Action
                  title="Copy with Secrets"
                  icon={Icon.Key}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={async () => {
                    await Clipboard.copy(result.revealed);
                    await showHUD("Kopiert mit Geheimnissen");
                  }}
                />
                <Action
                  title={reveal ? "Hide Secrets" : "Show Secrets"}
                  icon={reveal ? Icon.EyeDisabled : Icon.Eye}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={() => setReveal((v) => !v)}
                />
                <SettingsActions />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {result && !result.ok && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Konvertierung nicht möglich" description={result.message} />
      )}

      {!hasInput && history.length > 0 && (
        <List.Section title="Verlauf (maskiert)">
          {history.map((entry) => (
            <List.Item
              key={`${entry.createdAt}-${entry.command}`}
              id={`${entry.createdAt}-${entry.command}`}
              title={entry.command}
              icon={Icon.Clock}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Masked" content={entry.command} />
                  <SettingsActions />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!hasInput && history.length === 0 && (
        <List.EmptyView
          icon={Icon.Terminal}
          title="curl-Befehl oder Raw-Request einfügen"
          description="Der hey-Befehl erscheint hier."
        />
      )}
    </List>
  );
}

function SettingsActions() {
  return (
    <ActionPanel.Section title="Settings">
      <Action title="Configure Command" icon={Icon.Gear} onAction={openCommandPreferences} />
      <Action title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}

function resultMarkdown(conversion: Conversion, command: string, revealed: boolean): string {
  const lines = [
    "## hey-Befehl",
    "",
    "```bash",
    command,
    "```",
    "",
    revealed
      ? "Geheimnisse werden **im Klartext** angezeigt. ⌘⇧R blendet sie wieder aus."
      : "Geheimnisse sind **maskiert**. ⌘⏎ kopiert mit Klartext, ⌘⇧R zeigt sie an.",
  ];

  const warnings = conversion.notes.filter((n) => n.kind === "warning");
  const ignored = conversion.notes.filter((n) => n.kind === "ignored");

  if (warnings.length > 0) {
    lines.push("", "### Hinweise", "", ...warnings.map((n) => `- ${n.text}`));
  }
  if (ignored.length > 0) {
    lines.push("", "### Nicht übernommen", "", ...ignored.map((n) => `- ${n.text}`));
  }
  return lines.join("\n");
}
