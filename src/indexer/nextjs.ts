import type { Store } from "../db/store.ts";
import type { LoadedProject } from "./project.ts";

/**
 * PHASE 3 – Next.js-Konventionen (baust du selbst)
 *
 * route:
 *   Files unter `src/app/` bzw. `app/` mit Namen page.tsx, layout.tsx, route.ts
 *   Name = URL-Pfad, z.B.
 *     src/app/(app)/todos/page.tsx          -> "/todos"            (Route-Groups in Klammern fallen weg)
 *     src/app/(app)/schule/[kuerzel]/page.tsx -> "/schule/[kuerzel]"
 *     src/app/api/files/[id]/route.ts       -> "/api/files/[id]"   (+ welche HTTP-Methoden exportiert werden: GET, POST ...)
 *   Kante: route -> default-Export der Datei (contains) oder direkt route -> file
 *
 * action:
 *   Files, die mit "use server" beginnen (z.B. src/app/actions.ts).
 *   Jede exportierte async function darin ist eine Server Action.
 *   Tipp: sf.getStatements()[0] ist ein ExpressionStatement mit String-Literal "use server".
 *   Achtung: "use server" kann auch INNERHALB einer Funktion stehen.
 */
export function indexNextjs(_store: Store, _lp: LoadedProject): void {
  // TODO Phase 3
}
