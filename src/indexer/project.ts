import fs from "node:fs";
import path from "node:path";
import { Project, type SourceFile } from "ts-morph";

/** Ordner, die nie indexiert werden. */
const IGNORED_DIRS = ["node_modules", ".next", ".git", ".lunagraph", "dist", "build", "out"];

export interface LoadedProject {
  /** Absoluter Pfad zum Projekt-Root (Ordner mit tsconfig.json) */
  root: string;
  project: Project;
  sourceFiles: SourceFile[];
  /** Absoluter Pfad -> posix-Pfad relativ zum Root ("src/lib/data.ts") */
  rel(absPath: string): string;
}

/**
 * Lädt das Zielprojekt über seine eigene tsconfig.json.
 *
 * Wichtig: Nur so werden Pfad-Aliase wie `@/lib/data` korrekt aufgelöst.
 * ts-morph nutzt intern dieselbe Modulauflösung wie der TypeScript-Compiler.
 */
export function loadProject(projectDir: string): LoadedProject {
  const root = path.resolve(projectDir);
  const tsConfigFilePath = path.join(root, "tsconfig.json");

  if (!fs.existsSync(tsConfigFilePath)) {
    throw new Error(`Keine tsconfig.json gefunden in ${root}`);
  }

  const project = new Project({
    tsConfigFilePath,
    // Wir brauchen keine Typprüfung der Abhängigkeiten, nur die Struktur.
    skipFileDependencyResolution: true,
  });

  const rel = (absPath: string) => path.relative(root, absPath).split(path.sep).join("/");

  const sourceFiles = project.getSourceFiles().filter((sf) => {
    const r = rel(sf.getFilePath());
    if (r.startsWith("..")) return false; // liegt außerhalb des Projekts
    if (sf.isDeclarationFile()) return false; // next-env.d.ts & Co.
    if (!/\.(ts|tsx|mts|cts)$/.test(r)) return false; // .js/.mjs erstmal ignorieren
    return !r.split("/").some((part) => IGNORED_DIRS.includes(part));
  });

  sourceFiles.sort((a, b) => rel(a.getFilePath()).localeCompare(rel(b.getFilePath())));

  return { root, project, sourceFiles, rel };
}
