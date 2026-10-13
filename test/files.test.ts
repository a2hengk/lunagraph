import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Store } from "../src/db/store.ts";
import { indexProject, type IndexResult } from "../src/indexer/index.ts";
import { packageName } from "../src/indexer/files.ts";

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "mini-next");

describe("Phase 1: files + imports (mini-next)", () => {
  let store: Store;
  let result: IndexResult;

  beforeAll(() => {
    store = new Store(":memory:");
    result = indexProject(FIXTURE, store);
  });

  afterAll(() => store.close());

  const fileIds = () =>
    (store.db.prepare("SELECT id FROM nodes WHERE kind = 'file' ORDER BY id").all() as { id: string }[]).map(
      (r) => r.id,
    );

  it("indexiert alle .ts/.tsx-Files, aber keine .d.ts", () => {
    expect(fileIds()).toEqual([
      "src/app/api/hello/route.ts",
      "src/app/page.tsx",
      "src/components/greeting.tsx",
      "src/lib/broken.ts",
      "src/lib/greet.ts",
      "src/lib/index.ts",
      "src/lib/lazy.ts",
      "src/lib/types.ts",
    ]);
    expect(result.files).toBe(8);
  });

  it("löst den Pfad-Alias @/ über die tsconfig auf", () => {
    expect(store.importsOf("src/app/page.tsx").out).toEqual(["src/components/greeting.tsx"]);
  });

  it("erfasst auch type-only Imports", () => {
    expect(store.importsOf("src/components/greeting.tsx").out).toEqual(["src/lib/greet.ts", "src/lib/types.ts"]);
  });

  it("löst Barrel-Files auf index.ts auf und folgt Re-Exports", () => {
    expect(store.importsOf("src/app/api/hello/route.ts").out).toContain("src/lib/index.ts");
    expect(store.importsOf("src/lib/index.ts").out).toEqual(["src/lib/greet.ts"]);
  });

  it("erfasst dynamische import()-Aufrufe", () => {
    expect(store.importsOf("src/lib/lazy.ts").out).toEqual(["src/lib/greet.ts"]);
  });

  it("legt npm-Pakete als package-Knoten an", () => {
    expect(store.importsOf("src/app/api/hello/route.ts").out).toContain("pkg:next");
  });

  it("überspringt CSS-Imports ohne sie als Fehler zu zählen", () => {
    expect(result.skipped).toBe(1);
  });

  it("merkt sich nicht auflösbare lokale Imports", () => {
    expect(store.unresolved()).toEqual([{ file: "src/lib/broken.ts", specifier: "./does-not-exist" }]);
  });

  it("findet greet.ts als meistimportiertes File", () => {
    expect(store.mostImported(1)[0]).toMatchObject({ id: "src/lib/greet.ts", count: 3 });
  });

  it("speichert mtime und sha1-Hash pro File", () => {
    const row = store.db.prepare("SELECT * FROM files WHERE path = 'src/lib/greet.ts'").get() as {
      mtime: number;
      hash: string;
    };
    expect(row.mtime).toBeGreaterThan(0);
    expect(row.hash).toMatch(/^[0-9a-f]{40}$/);
  });

  it("ist idempotent: zweiter Lauf ergibt dasselbe", () => {
    const before = store.countEdgesByKind();
    indexProject(FIXTURE, store);
    expect(store.countEdgesByKind()).toEqual(before);
  });
});

describe("packageName", () => {
  it.each([
    ["react", "react"],
    ["next/server", "next"],
    ["drizzle-orm/pg-core", "drizzle-orm"],
    ["@vercel/blob", "@vercel/blob"],
    ["@vercel/blob/client", "@vercel/blob"],
    ["node:fs", "node:fs"],
  ])("%s -> %s", (input, expected) => {
    expect(packageName(input)).toBe(expected);
  });
});
