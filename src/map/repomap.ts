import type { Store } from "../db/store.ts";

/**
 * PHASE 4 – Repo-Map (baust du selbst)
 *
 * Erzeugt eine ARCHITECTURE.md im Zielprojekt, auf die die CLAUDE.md verweist.
 * Ziel: unter ~150 Zeilen, damit Claude sie bei jedem Start billig lesen kann.
 *
 * Mögliche Abschnitte:
 *   ## Routes          /todos -> page.tsx -> nutzt Actions X, Y
 *   ## Server Actions  createTodo (src/app/actions.ts:12) -> todos
 *   ## Tabellen        todos: von 4 Funktionen genutzt
 *   ## Zentrale Files  nach eingehenden Kanten sortiert (store.mostImported)
 *   ## Pakete          drizzle-orm, better-auth ...
 *
 * Immer `file:line` mitgeben, damit Claude gezielt lesen kann statt zu suchen.
 */
export function renderRepoMap(_store: Store): string {
  throw new Error("Repo-Map kommt in Phase 4");
}
