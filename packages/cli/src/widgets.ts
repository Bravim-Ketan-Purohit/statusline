import { readdirSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  ManifestSchema, manifestToTile, registry, BUILTIN_IDS, type Manifest,
} from "@statusline/core";
import { CONFIG_DIR } from "./paths.js";
import { readCredentials } from "./credentials.js";
import { isApproved } from "./approvals.js";
import { fetchJson } from "./integrations.js";
import { run, cacheRead, cacheWrite, CACHE_DIR } from "./cache.js";

/**
 * Loading declarative widgets.
 *
 * A malformed manifest must never blank the status line, so every failure is
 * collected and reported by `doctor` rather than thrown. A widget that fetches
 * runs only inside the detached refresh, exactly like a built-in producer.
 */

export const WIDGETS_DIR = join(CONFIG_DIR, "widgets");

export interface LoadResult { loaded: Manifest[]; errors: { file: string; message: string }[] }

/** Minimal YAML: the flat, two-level shape a manifest actually uses. */
export function parseSimpleYaml(text: string): unknown {
  const root: Record<string, unknown> = {};
  const stack: { indent: number; node: Record<string, unknown> }[] = [{ indent: -1, node: root }];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\t/g, "  ");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    const body = line.trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) stack.pop();
    const parent = stack[stack.length - 1]!.node;

    const m = /^([\w.-]+):\s*(.*)$/.exec(body);
    if (!m) continue;
    const key = m[1]!, rest = m[2]!;
    if (rest === "") {
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, node: child });
      continue;
    }
    parent[key] = coerce(rest);
  }
  return root;
}

function coerce(v: string): unknown {
  const s = v.trim();
  if (/^\[.*\]$/.test(s)) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((x) => coerce(x));
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === "true") return true;
  if (s === "false") return false;
  return s.replace(/^["']|["']$/g, "");
}

export function loadWidgets(): LoadResult {
  const out: LoadResult = { loaded: [], errors: [] };
  if (!existsSync(WIDGETS_DIR)) return out;
  for (const file of readdirSync(WIDGETS_DIR).filter((f) => /\.(ya?ml|json)$/i.test(f))) {
    const path = join(WIDGETS_DIR, file);
    try {
      const text = readFileSync(path, "utf8");
      const raw = /\.json$/i.test(file) ? JSON.parse(text) : parseSimpleYaml(text);
      const parsed = ManifestSchema.safeParse(raw);
      if (!parsed.success) {
        const i = parsed.error.issues[0]!;
        out.errors.push({ file, message: `${i.path.join(".") || "root"}: ${i.message}` });
        continue;
      }
      // Against BUILTIN_IDS, not the live registry: a manifest that has already
      // registered would otherwise collide with itself on every later load.
      if (BUILTIN_IDS.has(parsed.data.id)) {
        out.errors.push({ file, message: `id "${parsed.data.id}" collides with a built-in tile` });
        continue;
      }
      if (out.loaded.some((m) => m.id === parsed.data.id)) {
        out.errors.push({ file, message: `duplicate id "${parsed.data.id}" in another manifest` });
        continue;
      }
      out.loaded.push(parsed.data);
    } catch (e) {
      out.errors.push({ file, message: (e as Error).message });
    }
  }
  return out;
}

/** Registers loaded manifests as tiles. Returns how many were added. */
export function registerWidgets(loaded: Manifest[]): number {
  let n = 0;
  for (const m of loaded) {
    if (registry.has(m.id)) continue;
    registry.set(m.id, manifestToTile(m));
    n++;
  }
  return n;
}

const keyOf = (id: string) => `widget_${id}`;

export function collectWidgets(loaded: Manifest[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of loaded) {
    const hit = cacheRead<unknown>(keyOf(m.id), CACHE_DIR);
    if (hit) out[`manifest:${m.id}`] = JSON.stringify(hit.data);
  }
  return out;
}

export function staleWidgets(loaded: Manifest[]): string[] {
  return loaded.filter((m) => {
    const hit = cacheRead<unknown>(keyOf(m.id), CACHE_DIR);
    return !hit || hit.ageMs > m.cache * 1000;
  }).map((m) => m.id);
}

/** Runs one widget's fetch. Only ever called inside a detached refresh. */
export function refreshWidget(id: string) {
  const m = loadWidgets().loaded.find((x) => x.id === id);
  if (!m) return;
  const creds = readCredentials();
  // A widget whose credential is absent fetches nothing rather than sending
  // a request with an empty Authorization header.
  if (m.credentials.some((c) => !creds[c])) return;

  const sub = (s: string) =>
    s.replace(/\{\{\s*cred\.([\w-]+)\s*\}\}/g, (_x, k: string) => creds[k] ?? "");

  let payload: unknown = null;
  if (m.fetch.type === "http") {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(m.fetch.headers)) headers[k] = sub(v);
    payload = fetchJson(sub(m.fetch.url), {
      method: m.fetch.method, headers,
      body: m.fetch.body ? sub(m.fetch.body) : undefined,
    });
  } else {
    // Same gate as a custom command: an unapproved argv never runs.
    if (!isApproved(m.fetch.run)) return;
    const text = run(m.fetch.run[0]!, m.fetch.run.slice(1), m.fetch.cwd, 8000);
    try { payload = JSON.parse(text); } catch { payload = { text }; }
  }
  if (payload !== null) cacheWrite(keyOf(m.id), CACHE_DIR, payload);
}

export function ensureWidgetsDir() {
  try { mkdirSync(WIDGETS_DIR, { recursive: true, mode: 0o700 }); } catch { /* exists */ }
}
