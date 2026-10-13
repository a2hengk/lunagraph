import type { Store } from "../db/store.ts";
import type { LoadedProject } from "./project.ts";

/**
 * PHASE 2 – Aufrufe und Renders (baust du selbst, nach symbols.ts)
 *
 * Ziel:
 *   calls    Funktion A ruft Funktion B auf        (CallExpression)
 *   renders  Komponente A rendert Komponente B     (JsxOpeningElement / JsxSelfClosingElement)
 *
 * Der Kern-Trick: NICHT über den Namen matchen, sondern über das Symbol auflösen.
 *
 *   const target = call.getExpression().getSymbol();
 *   const decl = (target?.getAliasedSymbol() ?? target)?.getDeclarations()[0];
 *
 * getAliasedSymbol() ist wichtig: bei `import { getTodos } from "@/lib/data"` zeigt
 * getSymbol() erst auf den Import-Alias, nicht auf die echte Funktion.
 *
 * Aus `decl` dann die Knoten-ID bauen: `${lp.rel(decl.getSourceFile().getFilePath())}#${name}`
 * und nur eine Kante schreiben, wenn dieser Knoten existiert (Funktionen aus npm-Paketen ignorieren).
 *
 * Woher weißt du, in welcher Funktion ein Aufruf steht?
 *   call.getFirstAncestor(n => Node.isFunctionDeclaration(n) || Node.isArrowFunction(n) || ...)
 *   -> für Arrow Functions den Namen über die umgebende VariableDeclaration holen.
 *
 * Hinweis: Symbol-Auflösung braucht den TypeChecker. Bei Problemen in project.ts
 * `skipFileDependencyResolution` testweise auf false setzen.
 *
 * Fertig wenn: für 3 Funktionen aus Lunas OS die Aufrufer mit
 * "Find All References" in VS Code übereinstimmen.
 */
export function indexCalls(_store: Store, _lp: LoadedProject): void {
  // TODO Phase 2
}
