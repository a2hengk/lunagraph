/**
 * Messläufe mit Claude Code im Headless-Modus.
 *
 *   npx tsx bench/run.ts --project ../home-dashboard --variant ohne-graph
 *   npx tsx bench/run.ts --project ../home-dashboard --variant repo-map
 *   npx tsx bench/run.ts --project ../home-dashboard --variant map+mcp --mcp
 *   npx tsx bench/run.ts --report
 *
 * Jeder Lauf hängt eine Zeile an bench/results.jsonl an. --report fasst alles
 * pro Aufgabe und Variante zusammen (Durchschnitt).
 *
 * Damit die Zahlen vergleichbar bleiben: immer dasselbe Modell (--model),
 * dieselbe Claude-Code-Version und nichts an deiner globalen ~/.claude/CLAUDE.md ändern.
 * Alle Aufgaben sind read-only, Edit/Write sind gesperrt.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

interface Task {
  id: string;
  type: string;
  prompt: string;
}

interface ResultLine {
  at: string;
  variant: string;
  task: string;
  run: number;
  ok: boolean;
  inputTokens: number; // input + cache_creation + cache_read = alles, was das Modell lesen musste
  outputTokens: number;
  costUsd: number;
  turns: number;
  durationMs: number;
  answer: string;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const resultsFile = path.join(here, "results.jsonl");

const { values } = parseArgs({
  options: {
    project: { type: "string" },
    variant: { type: "string" },
    mcp: { type: "boolean", default: false },
    runs: { type: "string", default: "3" },
    task: { type: "string" },
    model: { type: "string", default: "sonnet" },
    report: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});

if (values.report) {
  report();
} else {
  run();
}

function run() {
  if (!values.project || !values.variant) {
    console.error("--project und --variant sind Pflicht (oder --report)");
    process.exit(1);
  }
  const cwd = path.resolve(values.project);
  const tasks = (JSON.parse(fs.readFileSync(path.join(here, "tasks.json"), "utf8")) as Task[]).filter(
    (t) => !values.task || t.id === values.task,
  );

  // Ohne --mcp: leere MCP-Config + strict, damit wirklich kein Server geladen wird.
  const emptyMcp = path.join(os.tmpdir(), "lunagraph-empty-mcp.json");
  fs.writeFileSync(emptyMcp, JSON.stringify({ mcpServers: {} }));
  const mcpArgs = values.mcp ? [] : ["--strict-mcp-config", "--mcp-config", emptyMcp];

  for (const task of tasks) {
    for (let i = 1; i <= Number(values.runs); i++) {
      const args = [
        "-p", // Prompt kommt über stdin, so gibt es unter Windows keine Quoting-Probleme
        "--output-format",
        "json",
        "--model",
        values.model!,
        "--no-session-persistence",
        "--disallowedTools",
        "Edit",
        "Write",
        "NotebookEdit",
        ...mcpArgs,
      ];

      if (values["dry-run"]) {
        console.log(`[dry-run] (cd ${cwd} && echo ${JSON.stringify(task.prompt)} | claude ${args.join(" ")})`);
        continue;
      }

      process.stdout.write(`${values.variant} · ${task.id} · lauf ${i} ... `);
      const proc = spawnSync("claude", args, {
        cwd,
        input: task.prompt,
        encoding: "utf8",
        shell: process.platform === "win32", // claude ist dort ein .cmd-Shim
        maxBuffer: 64 * 1024 * 1024,
      });
      const line = parse(proc.stdout, values.variant!, task.id, i);
      fs.appendFileSync(resultsFile, JSON.stringify(line) + "\n");
      console.log(line.ok ? `${line.inputTokens} in / ${line.turns} turns / $${line.costUsd.toFixed(4)}` : "FEHLER");
    }
  }
}

function parse(stdout: string, variant: string, task: string, run: number): ResultLine {
  const base = { at: new Date().toISOString(), variant, task, run };
  try {
    const j = JSON.parse(stdout);
    // modelUsage = Summe über alle Modelle und Turns der Session (inkl. interner Hilfsaufrufe).
    // Das ist die ehrliche Gesamtzahl; `usage` oben im JSON zeigt nur einen Teil.
    const models = Object.values(j.modelUsage ?? {}) as Record<string, number>[];
    const sum = (key: string) => models.reduce((a, m) => a + (m[key] ?? 0), 0);
    return {
      ...base,
      ok: !j.is_error,
      inputTokens: sum("inputTokens") + sum("cacheReadInputTokens") + sum("cacheCreationInputTokens"),
      outputTokens: sum("outputTokens"),
      costUsd: j.total_cost_usd ?? 0,
      turns: j.num_turns ?? 0,
      durationMs: j.duration_ms ?? 0,
      answer: String(j.result ?? ""),
    };
  } catch {
    return { ...base, ok: false, inputTokens: 0, outputTokens: 0, costUsd: 0, turns: 0, durationMs: 0, answer: stdout };
  }
}

function report() {
  if (!fs.existsSync(resultsFile)) {
    console.log("noch keine ergebnisse in bench/results.jsonl");
    return;
  }
  const lines = fs
    .readFileSync(resultsFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as ResultLine)
    .filter((l) => l.ok);

  const groups = new Map<string, ResultLine[]>();
  for (const l of lines) {
    const key = `${l.task}\t${l.variant}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log("| aufgabe | variante | läufe | input-tokens | turns | kosten (usd) | dauer (s) |");
  console.log("| --- | --- | --- | --- | --- | --- | --- |");
  for (const [key, ls] of [...groups].sort()) {
    const [task, variant] = key.split("\t");
    console.log(
      `| ${task} | ${variant} | ${ls.length} | ${Math.round(avg(ls.map((l) => l.inputTokens)))} | ` +
        `${avg(ls.map((l) => l.turns)).toFixed(1)} | ${avg(ls.map((l) => l.costUsd)).toFixed(4)} | ` +
        `${(avg(ls.map((l) => l.durationMs)) / 1000).toFixed(1)} |`,
    );
  }
  console.log("\nkorrektheit prüfst du selbst: die antworten stehen in bench/results.jsonl (feld answer).");
}
