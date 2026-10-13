# lunagraph

Lernprojekt von Kevin: Code-Knowledge-Graph (ts-morph + SQLite + MCP) für Next.js/TS-Projekte. Konzept und Phasenplan stehen in der README.

## Wichtig: Lernprojekt

Ab Phase 2 implementiert Kevin selbst. Erkläre, gib Hinweise, reviewe Code und zeig Fehler direkt auf – aber schreib keine kompletten Phasen-Implementierungen, außer er fragt ausdrücklich danach.

## Befehle

- `npm test` – vitest gegen `test/fixtures/mini-next`
- `npm run typecheck`
- `npm run lunagraph -- index <projekt>` / `stats` / `imports <file>`

## Konventionen

- ESM, relative Imports mit `.ts`-Endung (`import { Store } from "../db/store.ts"`), ausgeführt über `tsx`
- Pfade in der DB immer posix und relativ zum Projekt-Root (`src/lib/data.ts`), Kevin arbeitet unter Windows
- Knoten-IDs: File = Pfad, Symbol = `pfad#name`, Paket = `pkg:name`
- Kommentare auf Deutsch
- Keine zusätzlichen Dependencies ohne Grund; kein Neo4j, keine Embeddings (siehe Konzept)
