import type { Store } from "../db/store.ts";
import type { LoadedProject } from "./project.ts";

/**
 * PHASE 2 – Symbole (baust du selbst)
 *
 * Ziel: pro File die wichtigen Symbole als Knoten + eine `contains`-Kante File -> Symbol.
 *
 * Knoten-ID: `${filePath}#${name}`, z.B. "src/lib/data.ts#getTodos"
 *
 * Was rein soll:
 *   - function   sf.getFunctions()                  -> FunctionDeclaration
 *                sf.getVariableDeclarations()       -> `const x = () => ...` / `function () {}`
 *                (Initializer prüfen: Node.isArrowFunction / Node.isFunctionExpression)
 *   - component  wie function, aber: Datei endet auf .tsx, Name in PascalCase
 *                und der Body enthält JSX (getDescendantsOfKind(SyntaxKind.JsxElement / JsxSelfClosingElement / JsxFragment))
 *   - type       sf.getInterfaces(), sf.getTypeAliases() – nur exportierte
 *
 * Pro Knoten speichern:
 *   startLine/endLine  node.getStartLineNumber() / getEndLineNumber()
 *   exported           node.isExported()
 *   signature          kurz halten! z.B. Parameter + Rückgabetyp als Text:
 *                      fn.getParameters().map(p => p.getText()).join(", ")
 *                      fn.getReturnTypeNode()?.getText()
 *   doc                erste Zeile JSDoc: fn.getJsDocs()[0]?.getDescription().split("\n")[0]
 *
 * Fallen:
 *   - `export default function()` hat keinen Namen -> Name "default" verwenden
 *   - Next.js-Pages sind fast immer `export default function Page()`
 *
 * Test: in test/files.test.ts einen neuen describe-Block anlegen und gegen
 *       test/fixtures/mini-next prüfen, ob Greeting als component erkannt wird.
 */
export function indexSymbols(_store: Store, _lp: LoadedProject): void {
  // TODO Phase 2
}
