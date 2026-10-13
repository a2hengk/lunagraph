import { Store } from "../db/store.ts";
import { indexFiles, type FileIndexResult } from "./files.ts";
import { loadProject } from "./project.ts";
import { indexSymbols } from "./symbols.ts";
import { indexCalls } from "./calls.ts";
import { indexNextjs } from "./nextjs.ts";
import { indexDrizzle } from "./drizzle.ts";

export interface IndexResult extends FileIndexResult {
  root: string;
  durationMs: number;
}

/**
 * Indexiert ein Projekt komplett neu.
 *
 * Reihenfolge ist wichtig: spätere Schritte bauen auf Knoten früherer Schritte auf
 * (calls braucht die Funktions-Knoten aus symbols usw.).
 */
export function indexProject(projectDir: string, store: Store): IndexResult {
  const start = performance.now();
  const lp = loadProject(projectDir);

  const files = store.transaction(() => {
    store.reset(); // Phase 6: durch inkrementelles Update ersetzen
    const files = indexFiles(store, lp); // Phase 1 ✓
    indexSymbols(store, lp); // Phase 2
    indexCalls(store, lp); // Phase 2
    indexNextjs(store, lp); // Phase 3
    indexDrizzle(store, lp); // Phase 3
    return files;
  });

  return { ...files, root: lp.root, durationMs: Math.round(performance.now() - start) };
}
