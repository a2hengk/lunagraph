import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema.ts";

export type NodeKind =
  | "file"
  | "package"
  | "function"
  | "component"
  | "route"
  | "action"
  | "table"
  | "type";

export type EdgeKind =
  | "imports"
  | "contains"
  | "calls"
  | "renders"
  | "uses_table"
  | "uses_type";

export interface FileRow {
  path: string;
  mtime: number;
  hash: string;
}

export interface NodeRow {
  id: string;
  kind: NodeKind;
  name: string;
  file: string | null;
  startLine?: number | null;
  endLine?: number | null;
  signature?: string | null;
  doc?: string | null;
  exported?: boolean;
}

export interface EdgeRow {
  src: string;
  dst: string;
  kind: EdgeKind;
}

function prepareStatements(db: Database.Database) {
  return {
    upsertFile: db.prepare(
      "INSERT INTO files (path, mtime, hash) VALUES (@path, @mtime, @hash) " +
        "ON CONFLICT(path) DO UPDATE SET mtime = excluded.mtime, hash = excluded.hash",
    ),
    // OR IGNORE: Paket-Knoten wie 'pkg:react' werden von vielen Files gemeldet
    insertNode: db.prepare(
      "INSERT OR IGNORE INTO nodes (id, kind, name, file, start_line, end_line, signature, doc, exported) " +
        "VALUES (@id, @kind, @name, @file, @startLine, @endLine, @signature, @doc, @exported)",
    ),
    insertEdge: db.prepare(
      "INSERT OR IGNORE INTO edges (src, dst, kind) VALUES (@src, @dst, @kind)",
    ),
    insertUnresolved: db.prepare(
      "INSERT OR IGNORE INTO unresolved (file, specifier) VALUES (?, ?)",
    ),
  };
}

/**
 * Dünne Schicht über better-sqlite3. Alles synchron, das ist bei SQLite
 * lokal schneller und einfacher als async.
 */
export class Store {
  readonly db: Database.Database;

  private stmts: ReturnType<typeof prepareStatements>;

  constructor(dbPath: string) {
    if (dbPath !== ":memory:") {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA_SQL);
    this.db
      .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)")
      .run(String(SCHEMA_VERSION));

    this.stmts = prepareStatements(this.db);
  }

  /** Alles löschen. Phase 1 indexiert immer komplett neu, Phase 6 ersetzt das. */
  reset(): void {
    this.db.exec("DELETE FROM edges; DELETE FROM unresolved; DELETE FROM nodes; DELETE FROM files;");
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  upsertFile(row: FileRow): void {
    this.stmts.upsertFile.run(row);
  }

  insertNode(row: NodeRow): void {
    this.stmts.insertNode.run({
      startLine: null,
      endLine: null,
      signature: null,
      doc: null,
      ...row,
      exported: row.exported ? 1 : 0,
    });
  }

  insertEdge(row: EdgeRow): void {
    this.stmts.insertEdge.run(row);
  }

  insertUnresolved(file: string, specifier: string): void {
    this.stmts.insertUnresolved.run(file, specifier);
  }

  // ---------- Abfragen für `lunagraph stats` ----------

  countNodesByKind(): { kind: string; count: number }[] {
    return this.db
      .prepare("SELECT kind, COUNT(*) AS count FROM nodes GROUP BY kind ORDER BY count DESC")
      .all() as { kind: string; count: number }[];
  }

  countEdgesByKind(): { kind: string; count: number }[] {
    return this.db
      .prepare("SELECT kind, COUNT(*) AS count FROM edges GROUP BY kind ORDER BY count DESC")
      .all() as { kind: string; count: number }[];
  }

  /** Files, die am häufigsten importiert werden = zentrale Bausteine des Projekts. */
  mostImported(limit = 10): { id: string; kind: string; count: number }[] {
    return this.db
      .prepare(
        `SELECT n.id, n.kind, COUNT(*) AS count
         FROM edges e JOIN nodes n ON n.id = e.dst
         WHERE e.kind = 'imports'
         GROUP BY n.id ORDER BY count DESC, n.id LIMIT ?`,
      )
      .all(limit) as { id: string; kind: string; count: number }[];
  }

  /** Projektdateien, die niemand importiert (Einstiegspunkte oder toter Code). */
  notImported(): string[] {
    return (
      this.db
        .prepare(
          `SELECT n.id FROM nodes n
           WHERE n.kind = 'file'
             AND NOT EXISTS (SELECT 1 FROM edges e WHERE e.dst = n.id AND e.kind = 'imports')
           ORDER BY n.id`,
        )
        .all() as { id: string }[]
    ).map((r) => r.id);
  }

  unresolved(): { file: string; specifier: string }[] {
    return this.db
      .prepare("SELECT file, specifier FROM unresolved ORDER BY file, specifier")
      .all() as { file: string; specifier: string }[];
  }

  /** Direkte Import-Nachbarn eines Files, für schnelle Kontrolle per CLI. */
  importsOf(fileId: string): { out: string[]; in: string[] } {
    const out = this.db
      .prepare("SELECT dst FROM edges WHERE src = ? AND kind = 'imports' ORDER BY dst")
      .all(fileId) as { dst: string }[];
    const inc = this.db
      .prepare("SELECT src FROM edges WHERE dst = ? AND kind = 'imports' ORDER BY src")
      .all(fileId) as { src: string }[];
    return { out: out.map((r) => r.dst), in: inc.map((r) => r.src) };
  }

  close(): void {
    this.db.close();
  }
}
