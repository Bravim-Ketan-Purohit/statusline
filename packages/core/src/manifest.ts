import { z } from "zod";
import { span, type Span } from "./spans.js";
import type { RuntimeData } from "./runtime.js";
import type { TileModule } from "./tiles/types.js";

/**
 * Declarative widgets.
 *
 * The shape here is generalised from the three integrations that were built
 * first -- Linear (POST + GraphQL body + nested arrays), Sentry (GET + a top
 * level array + a string field that must be coerced), Vercel (GET + an object
 * with an array under a key, and two fields subtracted for a duration). Every
 * feature below exists because one of those needed it, not because it seemed
 * useful.
 *
 * Two rules are structural, not stylistic:
 *  - `command` is an argv array. A shell string in a shareable file is remote
 *    code execution with a friendly face, and the host gates it on approval.
 *  - The host does the fetching. This module only describes and formats, so a
 *    manifest can never reach the network from inside a render.
 */

export const ManifestSchema = z.object({
  id: z.string().min(1).max(48).regex(/^[a-z0-9][a-z0-9-]*$/,
    "id must be lowercase kebab-case so it is safe as a tile id and a filename"),
  name: z.string().min(1).max(60),
  category: z.enum(["session", "git", "environment", "personal", "media", "layout"]).default("session"),
  /** seconds; the host caches for this long */
  cache: z.number().min(1).max(86_400).default(120),
  /** credential names this widget needs; absent ones make it render nothing */
  credentials: z.array(z.string().min(1)).max(6).default([]),

  fetch: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("http"),
      url: z.string().url(),
      method: z.enum(["GET", "POST"]).default("GET"),
      headers: z.record(z.string()).default({}),
      body: z.string().optional(),
    }),
    z.object({
      type: z.literal("command"),
      // argv only. Never a shell string.
      run: z.array(z.string().min(1)).min(1).max(24),
      cwd: z.string().optional(),
    }),
  ]),

  /** name -> path expression, evaluated against the parsed response */
  extract: z.record(z.string().min(1)).default({}),

  render: z.object({
    full: z.string().min(1),
    compact: z.string().optional(),
    /** hide when this expression is truthy, e.g. "count == 0" */
    hideWhen: z.string().optional(),
  }),
});

export type Manifest = z.infer<typeof ManifestSchema>;

/**
 * The path subset the three real integrations actually needed:
 *   $.total                  a field
 *   $.deployments[0].state   an index
 *   $.data.viewer.nodes.length   a length
 *   $.length                 a top-level array length
 *   $[*].count.sum           sum a field across an array
 *   $[*].state=started.count  count members matching a field
 * Written rather than pulled in, so the CLI keeps no dependency for it.
 */
export function evalPath(root: unknown, path: string): unknown {
  if (!path.startsWith("$")) return undefined;
  let cur: unknown = root;
  const rest = path.slice(1);
  const parts = rest.split(".").filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (cur === null || cur === undefined) return undefined;

    // [*] — the remaining parts describe an aggregate over the array
    if (part.startsWith("[*]") || part === "[*]") {
      const arr = Array.isArray(cur) ? cur : undefined;
      if (!arr) return undefined;
      const after = parts.slice(i + 1);
      if (!after.length) return arr.length;
      const last = after[after.length - 1]!;
      // The path was split on ".", so a nested field like `state.type=started`
      // arrives as two parts. Rejoin before matching the equality.
      const lead = after.slice(0, -1).join(".");
      // $[*].a.b=value.count -> how many members match
      const eq = /^([\w.]+)=(.+)$/.exec(lead);
      if (eq && last === "count") {
        return arr.filter((x) => String(evalPath({ v: x }, "$.v." + eq[1]!)) === eq[2]).length;
      }
      // $[*].a.b.sum -> total, coercing strings (Sentry returns counts as "412")
      if (last === "sum") {
        return arr.reduce((n, x) => n + (Number(evalPath({ v: x }, "$.v." + lead)) || 0), 0);
      }
      // $[*].a.b.count with no predicate -> how many have that field set
      if (last === "count") {
        return arr.filter((x) => evalPath({ v: x }, "$.v." + lead) !== undefined).length;
      }
      return undefined;
    }

    if (part === "length") {
      return Array.isArray(cur) ? cur.length
        : typeof cur === "string" ? cur.length : undefined;
    }

    const idx = /^(\w+)?\[(\d+)\]$/.exec(part);
    if (idx) {
      if (idx[1]) cur = (cur as Record<string, unknown>)[idx[1]];
      if (!Array.isArray(cur)) return undefined;
      cur = cur[Number(idx[2])];
      continue;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** `{{name}}` substitution. Unknown names render empty, never "undefined". */
export function fillTemplate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k: string) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/**
 * A deliberately tiny predicate language: `name`, `name == n`, `name != n`,
 * `name > n`, `name < n`. Not an expression evaluator -- a manifest must not
 * be able to run arbitrary logic.
 */
export function evalPredicate(expr: string, vars: Record<string, unknown>): boolean {
  const m = /^\s*([\w.]+)\s*(==|!=|>=|<=|>|<)?\s*(.*?)\s*$/.exec(expr);
  if (!m) return false;
  const left = vars[m[1]!];
  if (!m[2]) return Boolean(left);
  const rightRaw = m[3] ?? "";
  const right = /^-?\d+(\.\d+)?$/.test(rightRaw) ? Number(rightRaw) : rightRaw.replace(/^["']|["']$/g, "");
  const l = typeof right === "number" ? Number(left) : String(left);
  switch (m[2]) {
    case "==": return l === right;
    case "!=": return l !== right;
    case ">":  return Number(l) > Number(right);
    case "<":  return Number(l) < Number(right);
    case ">=": return Number(l) >= Number(right);
    case "<=": return Number(l) <= Number(right);
    default:   return false;
  }
}

/** Turn a validated manifest into a tile the registry can hold. */
export function manifestToTile(m: Manifest): TileModule<Record<string, never>> {
  return {
    id: m.id,
    displayName: m.name,
    category: m.category,
    tier: m.fetch.type === "http" ? 4 : 2,
    capabilities: m.fetch.type === "http" ? ["needsNetwork"] : [],
    defaultProps: {},
    render(_props, data: RuntimeData, mode): Span[] {
      const raw = data.custom?.[`manifest:${m.id}`];
      if (!raw) return [];
      let payload: unknown;
      try { payload = JSON.parse(raw); } catch { return []; }

      const vars: Record<string, unknown> = {};
      for (const [name, path] of Object.entries(m.extract)) vars[name] = evalPath(payload, path);
      if (m.render.hideWhen && evalPredicate(m.render.hideWhen, vars)) return [];

      const tpl = mode === "compact" ? (m.render.compact ?? m.render.full) : m.render.full;
      const text = fillTemplate(tpl, vars).trim();
      return text ? [span(text)] : [];
    },
  };
}
