// SQLite-Schema für den Graphen.
// Als TS-String statt .sql-Datei, damit nichts kopiert oder per Pfad gesucht werden muss.

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = /* sql */ `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Ein Eintrag pro indexierter Datei. mtime + hash sind die Grundlage
-- für inkrementelles Indexieren (Phase 6).
CREATE TABLE IF NOT EXISTS files (
  path   TEXT PRIMARY KEY,   -- immer posix-Pfad, relativ zum Projekt-Root
  mtime  INTEGER NOT NULL,
  hash   TEXT NOT NULL
);

-- Knoten: Files, Symbole, Routes, Tabellen ...
-- file ist NULL bei Knoten, die zu keiner Projektdatei gehören (z.B. npm-Pakete).
CREATE TABLE IF NOT EXISTS nodes (
  id         TEXT PRIMARY KEY,  -- 'src/lib/data.ts' | 'src/lib/data.ts#getTodos' | 'pkg:drizzle-orm'
  kind       TEXT NOT NULL,     -- file | package | function | component | route | action | table | type
  name       TEXT NOT NULL,
  file       TEXT REFERENCES files(path) ON DELETE CASCADE,
  start_line INTEGER,
  end_line   INTEGER,
  signature  TEXT,
  doc        TEXT,
  exported   INTEGER NOT NULL DEFAULT 0
);

-- Kanten: gerichtet, src -> dst. "A imports B" = (A, B, 'imports').
CREATE TABLE IF NOT EXISTS edges (
  src  TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  dst  TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,           -- imports | contains | calls | renders | uses_table | uses_type
  PRIMARY KEY (src, dst, kind)
);

-- Imports, die weder auf eine Projektdatei noch auf ein Paket zeigen.
-- Nützlich zum Debuggen der Modulauflösung.
CREATE TABLE IF NOT EXISTS unresolved (
  file       TEXT NOT NULL REFERENCES files(path) ON DELETE CASCADE,
  specifier  TEXT NOT NULL,
  PRIMARY KEY (file, specifier)
);

CREATE INDEX IF NOT EXISTS idx_edges_dst   ON edges(dst, kind);
CREATE INDEX IF NOT EXISTS idx_nodes_name  ON nodes(name);
CREATE INDEX IF NOT EXISTS idx_nodes_file  ON nodes(file);
`;
