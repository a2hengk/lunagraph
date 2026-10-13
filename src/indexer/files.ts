import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Node, SyntaxKind, ts, type SourceFile } from "ts-morph";
import type { Store } from "../db/store.ts";
import type { LoadedProject } from "./project.ts";

/** Imports von Assets erzeugen keine Kanten (CSS, Bilder, Fonts ...). */
const ASSET_EXT = /\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp4|webm)$/i;

export interface FileIndexResult {
  files: number;
  internalImports: number;
  packageImports: number;
  unresolved: number;
  skipped: number;
}

type Resolution =
  | { type: "file"; target: string }
  | { type: "package"; name: string }
  | { type: "unresolved" }
  | { type: "skip" };

/**
 * Phase 1: ein `file`-Knoten pro Datei + `imports`-Kanten zwischen ihnen.
 *
 * Läuft in zwei Durchgängen: erst alle Files anlegen, dann die Kanten.
 * Grund: die Kanten haben Foreign Keys auf nodes(id), das Ziel muss also
 * schon existieren, wenn die Kante geschrieben wird.
 */
export function indexFiles(store: Store, lp: LoadedProject): FileIndexResult {
  const result: FileIndexResult = {
    files: 0,
    internalImports: 0,
    packageImports: 0,
    unresolved: 0,
    skipped: 0,
  };

  const indexed = new Set(lp.sourceFiles.map((sf) => lp.rel(sf.getFilePath())));

  // --- Durchgang 1: Files ---
  for (const sf of lp.sourceFiles) {
    const abs = sf.getFilePath();
    const rel = lp.rel(abs);
    const content = fs.readFileSync(abs);

    store.upsertFile({
      path: rel,
      mtime: Math.floor(fs.statSync(abs).mtimeMs),
      hash: crypto.createHash("sha1").update(content).digest("hex"),
    });
    store.insertNode({
      id: rel,
      kind: "file",
      name: path.posix.basename(rel),
      file: rel,
      startLine: 1,
      endLine: sf.getEndLineNumber(),
    });
    result.files++;
  }

  // --- Durchgang 2: Imports ---
  const resolver = createResolver(lp);

  for (const sf of lp.sourceFiles) {
    const from = lp.rel(sf.getFilePath());

    for (const specifier of collectSpecifiers(sf)) {
      const res = resolver(specifier, sf.getFilePath(), indexed);

      switch (res.type) {
        case "file":
          if (res.target === from) break; // Selbstimport ignorieren
          store.insertEdge({ src: from, dst: res.target, kind: "imports" });
          result.internalImports++;
          break;
        case "package": {
          const id = `pkg:${res.name}`;
          store.insertNode({ id, kind: "package", name: res.name, file: null });
          store.insertEdge({ src: from, dst: id, kind: "imports" });
          result.packageImports++;
          break;
        }
        case "unresolved":
          store.insertUnresolved(from, specifier);
          result.unresolved++;
          break;
        case "skip":
          result.skipped++;
          break;
      }
    }
  }

  return result;
}

/**
 * Sammelt alle Modul-Spezifizierer einer Datei:
 *   import x from "..."         (ImportDeclaration)
 *   export { x } from "..."     (ExportDeclaration, z.B. Barrel-Files)
 *   import("...")               (dynamischer Import mit String-Literal)
 */
export function collectSpecifiers(sf: SourceFile): string[] {
  const specs = new Set<string>();

  for (const decl of sf.getImportDeclarations()) {
    specs.add(decl.getModuleSpecifierValue());
  }
  for (const decl of sf.getExportDeclarations()) {
    const value = decl.getModuleSpecifierValue();
    if (value) specs.add(value);
  }
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getKind() !== SyntaxKind.ImportKeyword) continue;
    const arg = call.getArguments()[0];
    if (arg && Node.isStringLiteral(arg)) specs.add(arg.getLiteralValue());
  }

  return [...specs];
}

/**
 * Baut eine Funktion, die einen Spezifizierer so auflöst wie der TypeScript-Compiler.
 * Nutzt die compilerOptions aus der tsconfig des Zielprojekts (paths, baseUrl, moduleResolution).
 */
function createResolver(lp: LoadedProject) {
  const options = lp.project.getCompilerOptions();
  const host = ts.sys;
  const cache = ts.createModuleResolutionCache(lp.root, (f) => f, options);
  const localPrefixes = aliasPrefixes(options.paths);

  return (specifier: string, fromAbs: string, indexed: Set<string>): Resolution => {
    if (ASSET_EXT.test(specifier)) return { type: "skip" };

    const { resolvedModule } = ts.resolveModuleName(specifier, fromAbs, options, host, cache);

    if (resolvedModule && !resolvedModule.isExternalLibraryImport) {
      const rel = lp.rel(resolvedModule.resolvedFileName);
      if (indexed.has(rel)) return { type: "file", target: rel };
      // Liegt im Projekt, wird aber nicht indexiert (.json, .mjs, .d.ts ...)
      return { type: "skip" };
    }

    const isLocal =
      specifier.startsWith(".") ||
      specifier.startsWith("/") ||
      localPrefixes.some((p) => specifier.startsWith(p));

    if (isLocal) return { type: "unresolved" };
    return { type: "package", name: packageName(specifier) };
  };
}

/** "@/*" -> "@/"  |  "~lib/*" -> "~lib/" */
function aliasPrefixes(paths: ts.MapLike<string[]> | undefined): string[] {
  if (!paths) return [];
  return Object.keys(paths).map((key) => key.replace(/\*$/, ""));
}

/** "drizzle-orm/pg-core" -> "drizzle-orm"  |  "@vercel/blob/client" -> "@vercel/blob" */
export function packageName(specifier: string): string {
  if (specifier.startsWith("node:")) return specifier;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}
