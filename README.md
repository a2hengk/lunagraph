# lunagraph

Code-Knowledge-Graph für Next.js/TypeScript-Projekte. Indexiert ein Projekt einmal in eine SQLite-Datei, damit Claude Code Zusammenhänge (wer importiert/ruft was, welche Route fasst welche Tabelle an) nachschlagen kann, statt sich jedes Mal per grep neu durchs Projekt zu arbeiten.

Lernprojekt. Konzept mit Architektur, Datenmodell, MCP-Tools und Messplan: [lunagraph – Konzept](https://claude.ai/code/artifact/aa7ad49e-984c-4890-a418-afc178a01b55)

## Stand

| Phase | Inhalt | Status |
| --- | --- | --- |
| 0 | Baseline messen (ohne Graph) | **als Nächstes, siehe unten** |
| 1 | Setup, Files & Imports | ✅ fertig |
| 2 | Symbole, Aufrufe, Renders | offen – `src/indexer/symbols.ts`, `calls.ts` |
| 3 | Next.js-Routes, Server Actions, Drizzle-Tabellen | offen – `nextjs.ts`, `drizzle.ts` |
| 4 | Repo-Map (`ARCHITECTURE.md`) | offen – `src/map/repomap.ts` |
| 5 | MCP-Server | offen – `src/mcp/server.ts` |
| 6 | Inkrementell + Git-Hook | offen – `src/indexer/incremental.ts` |
| 7 | Auswerten | offen – `bench/` |

Jede offene Datei enthält oben einen Kommentar mit Ziel, Ansatz und Fallen.

## Setup

Node.js 22 oder neuer.

```bash
npm install
npm test          # vitest gegen test/fixtures/mini-next
npm run typecheck
```

`better-sqlite3` ist ein natives Modul. Unter Windows kommen normalerweise fertige Binaries mit. Falls `npm install` nach Visual Studio Build Tools fragt: Node-Version prüfen (LTS nehmen) oder auf `node:sqlite` ausweichen.

## Nutzung

Alle Befehle bekommen den Pfad zum Zielprojekt (Ordner mit `tsconfig.json`). Die Datenbank landet in `<projekt>/.lunagraph/graph.db` – dort in die `.gitignore` aufnehmen.

```bash
npm run lunagraph -- index ../home-dashboard
npm run lunagraph -- stats ../home-dashboard
npm run lunagraph -- imports src/lib/data.ts ../home-dashboard
```

Die DB kannst du auch direkt anschauen, z.B. mit der VS-Code-Extension „SQLite Viewer" oder `sqlite3 .lunagraph/graph.db`.

### Ergebnis gegen Lunas OS (Stand Phase 1)

```
files            52      (in 440 ms)
pakete           14
import-kanten    228
nicht aufgelöst  0       -> @/-Alias und Barrel-Files funktionieren

am häufigsten importiert:  hud.tsx (17), lib/dates.ts (16), lib/types.ts (16), lib/session.ts (14)
von niemandem importiert:  19 Files – alles Pages, Routes, Layouts, Configs und proxy.ts
```

Die 19 nicht importierten Files sind genau die Einstiegspunkte, die Next.js selbst lädt. Auf File-Ebene gibt es also keinen toten Code. Ob einzelne Funktionen oder Tabellen ungenutzt sind, zeigt erst Phase 2/3.

## Phase 0: Baseline messen

Mach das **bevor** du mit Phase 2 anfängst, sonst hast du später nichts zum Vergleichen. Die Aufgaben stehen in `bench/tasks.json` und sind auf Lunas OS zugeschnitten. Alle sind read-only, das Script sperrt Edit/Write.

```bash
# erst schauen, was ausgeführt würde
npx tsx bench/run.ts --project ../home-dashboard --variant ohne-graph --dry-run

# 5 Aufgaben x 3 Läufe, Ergebnisse landen in bench/results.jsonl
npx tsx bench/run.ts --project ../home-dashboard --variant ohne-graph

# Tabelle mit Durchschnittswerten
npx tsx bench/run.ts --report
```

Später dieselben Läufe mit `--variant repo-map` (Phase 4) und `--variant map+mcp --mcp` (Phase 5).

Worauf achten:

- Gleiches Modell (`--model`, Standard `sonnet`), gleiche Claude-Code-Version, nichts an der globalen `~/.claude/CLAUDE.md` ändern zwischen den Läufen.
- Schon ein leeres „antworte mit ok" kostet rund 40k Input-Tokens (System-Prompt und Tool-Definitionen, größtenteils gecacht). Das ist der Boden, unter den kein Graph kommt.
- Die Korrektheit der Antworten (Feld `answer` in `results.jsonl`) prüfst du selbst. Weniger Tokens bei falscher Antwort zählt nicht.
- Lunas OS hat keine `CLAUDE.md`, nur eine `AGENTS.md` von Next.js. Für die Baseline so lassen.

## Phase 2: Einstieg

1. AST verstehen, bevor du Code schreibst: eine Datei aus Lunas OS in [ts-ast-viewer.com](https://ts-ast-viewer.com) einfügen und anschauen, wie `FunctionDeclaration`, `VariableDeclaration` + `ArrowFunction` und JSX aussehen.
2. `src/indexer/symbols.ts` umsetzen, Tests in `test/files.test.ts` ergänzen (oder neue `test/symbols.test.ts`). Die Fixture hat schon eine Komponente (`Greeting`) und Funktionen (`greet`, `lazyGreet`, `GET`).
3. Dann `calls.ts`. Der wichtigste Punkt steht im Kommentar: über Symbole auflösen (`getAliasedSymbol`), nicht über Namen.
4. Fertig-Kriterium aus dem Konzept: für 3 Funktionen aus Lunas OS stimmen die Aufrufer mit „Find All References" in VS Code überein.

## Struktur

```
src/
  cli.ts              index | stats | imports | map | serve
  db/schema.ts        SQLite-Schema (als TS-String)
  db/store.ts         Inserts und Abfragen
  indexer/
    index.ts          Reihenfolge der Index-Schritte
    project.ts        lädt das Zielprojekt über seine tsconfig
    files.ts          Phase 1: file-Knoten + imports-Kanten
    symbols.ts …      Phase 2–3 (Stubs mit Anleitung)
    incremental.ts    Phase 6 (Anleitung)
  map/repomap.ts      Phase 4
  mcp/server.ts       Phase 5
test/
  fixtures/mini-next  Mini-Next.js-Projekt mit Alias, Barrel-File, dynamic import, kaputtem Import
bench/
  tasks.json          Messaufgaben für Lunas OS
  run.ts              claude -p Läufe + Report
```

### Abweichungen vom Konzept

- Schema liegt als TS-String in `schema.ts` statt als `.sql`-Datei – spart Pfad-Gefrickel.
- Neuer Knotentyp `package` (z.B. `pkg:drizzle-orm`, `file` = NULL), damit man sieht, welche Files welche Pakete nutzen.
- Zusatztabelle `unresolved` für lokale Imports, die nicht aufgelöst werden konnten – zum Debuggen der Modulauflösung.
