import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ManifestSchema } from "@statusline/core";
import { fetchJson } from "./integrations.js";
import { run } from "./cache.js";
import { WIDGETS_DIR, ensureWidgetsDir, parseSimpleYaml } from "./widgets.js";

/**
 * The widget registry.
 *
 * A registry where a manifest can run a command is a supply-chain surface
 * aimed at developer machines, so three rules are not configurable:
 *
 *  1. A third-party manifest may only use `fetch.type: http`. A `command`
 *     manifest from the registry is refused outright, not gated -- you can
 *     still write one by hand locally, where you are the author.
 *  2. Nothing is installed without printing what it will do first.
 *  3. Installing never runs it. The next render does, through the same
 *     approval and credential paths as everything else.
 */

const DEFAULT_INDEX =
  "https://raw.githubusercontent.com/statusline-widgets/registry/main/index.json";

export interface RegistryEntry {
  id: string; name: string; category?: string;
  description?: string; author?: string; url: string;
}

const indexUrl = () => process.env.STATUSLINE_REGISTRY ?? DEFAULT_INDEX;

export function fetchIndex(): RegistryEntry[] | null {
  const res = fetchJson(indexUrl(), { timeoutMs: 10_000 });
  if (!Array.isArray(res)) return null;
  return res.filter((r): r is RegistryEntry =>
    !!r && typeof r === "object" && typeof (r as RegistryEntry).id === "string"
        && typeof (r as RegistryEntry).url === "string");
}

export function cmdSearch(term: string | undefined): number {
  const idx = fetchIndex();
  if (!idx) {
    process.stderr.write(`statusline: could not reach the registry at ${indexUrl()}\n`);
    return 1;
  }
  const q = (term ?? "").toLowerCase();
  const hits = q
    ? idx.filter((e) => `${e.id} ${e.name} ${e.description ?? ""}`.toLowerCase().includes(q))
    : idx;
  if (!hits.length) { process.stdout.write("no matches\n"); return 0; }
  for (const e of hits) {
    process.stdout.write(`${e.id.padEnd(24)} ${e.name}${e.author ? `  by ${e.author}` : ""}\n`);
    if (e.description) process.stdout.write(`${" ".repeat(24)} ${e.description}\n`);
  }
  process.stdout.write(`\n${hits.length} widget(s). Install with: statusline add <id>\n`);
  return 0;
}

export function cmdAdd(id: string | undefined, yes: boolean): number {
  if (!id) { process.stderr.write("usage: statusline add <id>\n"); return 1; }
  const idx = fetchIndex();
  if (!idx) { process.stderr.write("statusline: could not reach the registry\n"); return 1; }
  const entry = idx.find((e) => e.id === id);
  if (!entry) { process.stderr.write(`statusline: no widget "${id}" in the registry\n`); return 1; }

  const body = run("curl", ["-sS", "--max-time", "10", entry.url], undefined, 12_000);
  if (!body) { process.stderr.write(`statusline: could not download ${entry.url}\n`); return 1; }

  const parsed = ManifestSchema.safeParse(
    /\.json$/i.test(entry.url) ? JSON.parse(body) : parseSimpleYaml(body));
  if (!parsed.success) {
    process.stderr.write("statusline: that manifest is not valid:\n");
    for (const i of parsed.error.issues.slice(0, 3))
      process.stderr.write(`  ${i.path.join(".") || "root"}: ${i.message}\n`);
    return 1;
  }
  const m = parsed.data;

  // Rule 1. A downloaded manifest may not run a command, full stop.
  if (m.fetch.type === "command") {
    process.stderr.write(
      `statusline: refusing to install "${m.id}".\n\n` +
      `  It runs a command: ${JSON.stringify(m.fetch.run)}\n\n` +
      `Registry widgets are limited to fetch.type: http. A manifest from a\n` +
      `stranger that runs a command is arbitrary code on your machine. Write\n` +
      `one by hand in ${WIDGETS_DIR} if you want this, where you are the author.\n`);
    return 1;
  }

  // Rule 2. Say exactly what it will do before writing anything.
  process.stdout.write(`${m.name}  (${m.id})\n\n`);
  process.stdout.write(`  requests   ${m.fetch.method} ${m.fetch.url}\n`);
  const hdrs = Object.keys(m.fetch.headers);
  if (hdrs.length) process.stdout.write(`  headers    ${hdrs.join(", ")}\n`);
  if (m.credentials.length) process.stdout.write(`  needs      ${m.credentials.join(", ")}\n`);
  process.stdout.write(`  refreshes  every ${m.cache}s\n`);
  process.stdout.write(`  renders    ${m.render.full}\n\n`);

  if (!yes) {
    process.stdout.write("Re-run with --yes to install it.\n");
    return 1;
  }

  ensureWidgetsDir();
  const dest = join(WIDGETS_DIR, `${m.id}.yaml`);
  if (existsSync(dest)) { process.stderr.write(`statusline: ${dest} already exists\n`); return 1; }
  writeFileSync(dest, body, { mode: 0o600 });
  process.stdout.write(`installed ${dest}\n`);
  if (m.credentials.length)
    process.stdout.write(`add its credential: statusline creds set ${m.credentials[0]} <value>\n`);
  return 0;
}
