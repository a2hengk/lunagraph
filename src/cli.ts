import path from "node:path";
import { Command } from "commander";
import { Store } from "./db/store.ts";
import { indexProject } from "./indexer/index.ts";
import { renderRepoMap } from "./map/repomap.ts";
import { startServer } from "./mcp/server.ts";

const program = new Command();

program
  .name("lunagraph")
  .description("Code-Knowledge-Graph für Next.js/TypeScript-Projekte")
  .version("0.1.0");

/** Standard: <projekt>/.lunagraph/graph.db */
function dbPathFor(projectDir: string, override?: string): string {
  return override ? path.resolve(override) : path.resolve(projectDir, ".lunagraph", "graph.db");
}

program
  .command("index")
  .description("Projekt komplett (neu) indexieren")
  .argument("[dir]", "Projekt-Root mit tsconfig.json", ".")
  .option("--db <path>", "Pfad zur SQLite-Datei")
  .action((dir: string, opts: { db?: string }) => {
    const store = new Store(dbPathFor(dir, opts.db));
    try {
      const r = indexProject(dir, store);
      console.log(`indexiert: ${r.root} (${r.durationMs} ms)`);
      console.log(`  files            ${r.files}`);
      console.log(`  imports intern   ${r.internalImports}`);
      console.log(`  imports pakete   ${r.packageImports}`);
      console.log(`  übersprungen     ${r.skipped}  (assets, json ...)`);
      console.log(`  nicht aufgelöst  ${r.unresolved}${r.unresolved ? "  -> lunagraph stats zeigt welche" : ""}`);
    } finally {
      store.close();
    }
  });

program
  .command("stats")
  .description("Überblick über den Graphen")
  .argument("[dir]", "Projekt-Root", ".")
  .option("--db <path>", "Pfad zur SQLite-Datei")
  .option("-n, --top <n>", "Anzahl Einträge in Toplisten", "10")
  .action((dir: string, opts: { db?: string; top: string }) => {
    const store = new Store(dbPathFor(dir, opts.db));
    try {
      const top = Number(opts.top);

      console.log("knoten");
      for (const r of store.countNodesByKind()) console.log(`  ${r.kind.padEnd(12)} ${r.count}`);

      console.log("\nkanten");
      for (const r of store.countEdgesByKind()) console.log(`  ${r.kind.padEnd(12)} ${r.count}`);

      console.log(`\nam häufigsten importiert (top ${top})`);
      for (const r of store.mostImported(top)) {
        console.log(`  ${String(r.count).padStart(3)}  ${r.id}`);
      }

      const roots = store.notImported();
      console.log(`\nvon niemandem importiert (${roots.length}) – einstiegspunkte oder toter code`);
      for (const f of roots) console.log(`  ${f}`);

      const unresolved = store.unresolved();
      if (unresolved.length) {
        console.log(`\nnicht aufgelöst (${unresolved.length})`);
        for (const u of unresolved) console.log(`  ${u.file}  ->  ${u.specifier}`);
      }
    } finally {
      store.close();
    }
  });

program
  .command("imports")
  .description("Import-Nachbarn eines Files anzeigen")
  .argument("<file>", "File relativ zum Projekt-Root, z.B. src/lib/data.ts")
  .argument("[dir]", "Projekt-Root", ".")
  .option("--db <path>", "Pfad zur SQLite-Datei")
  .action((file: string, dir: string, opts: { db?: string }) => {
    const store = new Store(dbPathFor(dir, opts.db));
    try {
      const { out, in: inc } = store.importsOf(file.split(path.sep).join("/"));
      console.log(`${file} importiert (${out.length}):`);
      for (const f of out) console.log(`  -> ${f}`);
      console.log(`\nwird importiert von (${inc.length}):`);
      for (const f of inc) console.log(`  <- ${f}`);
    } finally {
      store.close();
    }
  });

program
  .command("map")
  .description("ARCHITECTURE.md generieren (Phase 4)")
  .argument("[dir]", "Projekt-Root", ".")
  .option("--db <path>", "Pfad zur SQLite-Datei")
  .action((dir: string, opts: { db?: string }) => {
    const store = new Store(dbPathFor(dir, opts.db));
    try {
      console.log(renderRepoMap(store));
    } finally {
      store.close();
    }
  });

program
  .command("serve")
  .description("MCP-Server über stdio starten (Phase 5)")
  .argument("[dir]", "Projekt-Root", ".")
  .option("--db <path>", "Pfad zur SQLite-Datei")
  .action(async (dir: string, opts: { db?: string }) => {
    await startServer(dbPathFor(dir, opts.db));
  });

program.parseAsync().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
