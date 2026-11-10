# Getting started: curl2hey

Dieses Repo enthält eine private, lokal ausgeführte Raycast-Extension. Sie wandelt einen eingefügten `curl`-Befehl in einen `hey`-Lasttest-Befehl um. Die Konvertierung läuft vollständig lokal: keine KI, keine Netzwerkaufrufe, kein externer Dienst. Die Extension wird nicht im Store veröffentlicht.

## Für den AI-Agenten: Raycast-Dokumentation

Bei Fragen zur Raycast-API nutze den bestehenden Raycast-Docs-MCP-Server. Baue keinen eigenen MCP-Server.

- MCP-URL: `https://developers.raycast.com/~gitbook/mcp`
- Werkzeuge: `searchDocumentation`, `getPage` (und `askQuestion`, wenn verfügbar)
- Die Konfiguration liegt in `.pi/mcp.json`.

Nützliche Einstiegsseiten:

- Getting Started: https://developers.raycast.com/basics/getting-started
- Erste Extension erstellen: https://developers.raycast.com/basics/create-your-first-extension
- Preferences: https://developers.raycast.com/api-reference/preferences
- List: https://developers.raycast.com/api-reference/user-interface/list
- Actions: https://developers.raycast.com/api-reference/user-interface/actions

## Eingabeformate

Das Eingabefeld akzeptiert zwei Formate:

- **curl-Befehl**, z. B. aus den Browser-DevTools oder einer Dokumentation.
- **Raw-Request**, wie HTTPie ihn exportiert: Request-Zeile (`GET /pfad HTTP/1.1`), Header, optional Leerzeile und Body.

Raw-Requests werden in einen äquivalenten curl-Befehl übersetzt (`src/lib/raw.ts`). Danach läuft derselbe Konverter wie bei curl.

Einschränkungen:

- Die Raycast-Suchleiste ist einzeilig. Zeilenumbrüche beim Einfügen werden zu Leerzeichen. Deshalb werden Header in einzeiligen Raw-Requests anhand des Musters `Name: Wert` getrennt.
- In einzeiligen Raw-Requests wird kein Body erkannt. Bodies brauchen einen curl-Befehl oder ein mehrzeiliges Eingabefeld (offen).
- Ohne `Host`-Header lässt sich keine URL bauen. Es gibt dann einen Fehler.
- Ohne Schema im Request-Target wird `https` angenommen. Der Hinweis erscheint unter „Hinweise“.

## Projektaufbau

- `src/curl2hey.tsx`: die View-Command (Liste mit Suchfeld als Eingabe, Ergebnis-Detail, Verlauf).
- `src/lib/tokenize.ts`: zerlegt den eingefügten Befehl in Argumente (Anführungszeichen, Zeilenfortsetzungen).
- `src/lib/convert.ts`: die Konvertierung curl → hey (`convertCurl`), die Eingangsweiche für beide Formate (`convertInput`) und das Rendern des Befehls (`renderCommand`). Reine Funktionen.
- `src/lib/raw.ts`: erkennt Raw-Requests und übersetzt sie in curl.
- `src/lib/mask.ts`: maskiert Geheimnisse (Authorization, Cookie).
- `src/lib/history.ts`: speichert die letzten Konvertierungen maskiert als JSON im Support-Verzeichnis der Extension.
- `src/lib/curl.test.ts`: Tests für den curl-Weg.
- `src/lib/raw.test.ts`: Tests für den Raw-Weg, einschließlich der einzeiligen Form aus der Suchleiste.
- `src/lib/mask.test.ts`: Tests für die Maskierung, die beide Wege nutzen.
- `.scratch/curl-to-hey/`: Tickets und Entscheidungen (lokale Markdown-Dateien). `map.md` ist die Übersicht.

## Befehle

```bash
npm install        # Abhängigkeiten
npm run dev        # Extension in Raycast laden (Hot Reload)
npm test           # alle Tests unter src/lib (curl, raw, mask)
npx tsc --noEmit   # Typprüfung
npm run lint       # Raycast-Lint
```

Voraussetzungen: Raycast 1.26.0 oder neuer, Node 22.14 oder neuer, npm 7 oder neuer. Für `npm run dev` musst du in Raycast angemeldet sein.

## Regeln für Änderungen

- Nur lokale Verarbeitung. Kein Code-Pfad darf einen KI-Dienst oder einen anderen externen Dienst aufrufen.
- Geheimnisse (Authorization, Cookie, `-u`-Passwort) werden in der Historie immer maskiert gespeichert. Auf dem Bildschirm sind sie standardmäßig maskiert.
- Nichts, was nicht übernommen wird, verschwindet still. Jede ignorierte Option steht in der Liste "Nicht übernommen".
- Entscheidungen werden in `.scratch/curl-to-hey/` festgehalten, bevor Code geändert wird.
