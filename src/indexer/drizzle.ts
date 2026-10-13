import type { Store } from "../db/store.ts";
import type { LoadedProject } from "./project.ts";

/**
 * PHASE 3 – Drizzle-Tabellen (baust du selbst)
 *
 * table:
 *   Jede `export const x = pgTable("name", ...)` ist ein table-Knoten.
 *   In Lunas OS: src/db/schema.ts und src/db/auth-schema.ts.
 *   Name = der SQL-Name (erstes Argument, z.B. "timetable_slots"),
 *   die TS-Variable (timetableSlots) zusätzlich in signature oder doc speichern.
 *
 * uses_table:
 *   Jede Funktion, die die Tabellen-Variable referenziert (db.select().from(todos),
 *   db.insert(events) ...), bekommt eine Kante Funktion -> Tabelle.
 *   Einfachster Weg: tableVar.findReferencesAsNodes() und für jede Referenz
 *   die umgebende Funktion bestimmen (gleicher Trick wie in calls.ts).
 *
 * Fertig wenn: eine SQL-Abfrage pro Tabelle eine plausible Liste an Funktionen liefert.
 */
export function indexDrizzle(_store: Store, _lp: LoadedProject): void {
  // TODO Phase 3
}
