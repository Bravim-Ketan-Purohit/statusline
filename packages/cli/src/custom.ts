import { spawnSync } from "node:child_process";
import { cacheRead, cacheWrite, CACHE_DIR } from "./cache.js";
import { stripAnsi } from "@statusline/core";
import { isApproved } from "./approvals.js";

/**
 * User-configured commands.
 *
 * The tile shipped for weeks reading a `custom` map that nothing populated, so
 * it rendered nothing and looked broken. This fills it.
 *
 * Two rules that are not negotiable. The command is an argv array run with
 * `shell: false` -- never `sh -c`, because a config can arrive from a pasted
 * base64 blob and a shell string there is arbitrary code with a friendly face.
 * And output is capped and stripped of ANSI before it reaches the width math,
 * because a command that emits colour would otherwise measure wrong.
 */

export const MAX_OUTPUT_BYTES = 4096;
const DEFAULT_TTL_MS = 30_000;

export interface CustomSpec {
  /** argv, already split. First element is the executable. */
  argv: string[];
  ttlMs: number;
  /** the raw config string, used as the cache key and the lookup key */
  key: string;
}

/**
 * Configs store the command as a string for editability. Split it here on
 * whitespace, honouring simple quoting, and never hand it to a shell.
 */
export function toArgv(command: string): string[] {
  const out: string[] = [];
  let cur = "", quote: '"' | "'" | null = null;
  for (const ch of command) {
    if (quote) {
      if (ch === quote) quote = null; else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (cur) { out.push(cur); cur = ""; }
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

const keyOf = (command: string) =>
  "cmd_" + Buffer.from(command).toString("base64url").slice(0, 60);

/** Runs one command. Only ever called inside the detached refresh. */
export function runCustom(spec: CustomSpec, columns: number): string {
  if (!spec.argv.length) return "";
  // An unapproved command never runs. `statusline approve` is the only way in.
  if (!isApproved(spec.argv)) return "";
  try {
    const r = spawnSync(spec.argv[0]!, spec.argv.slice(1), {
      shell: false,                       // never a shell
      encoding: "utf8",
      timeout: 2000,
      maxBuffer: MAX_OUTPUT_BYTES * 4,
      windowsHide: true,
      // The spec says a custom command receives the terminal width on stdin.
      input: JSON.stringify({ terminal_width: columns }) + "\n",
    });
    if (r.status !== 0) return "";
    const text = stripAnsi(r.stdout ?? "").split("\n")[0] ?? "";
    return text.slice(0, 200);
  } catch {
    return "";
  }
}

export function refreshCustom(command: string, columns: number) {
  const spec: CustomSpec = { argv: toArgv(command), ttlMs: DEFAULT_TTL_MS, key: command };
  cacheWrite(keyOf(command), CACHE_DIR, { out: runCustom(spec, columns) });
}

/** Read every configured command's cached output, refreshing stale ones. */
export function collectCustom(
  commands: { command: string; ttlMs: number }[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of commands) {
    if (!c.command) continue;
    const hit = cacheRead<{ out: string }>(keyOf(c.command), CACHE_DIR);
    if (hit) out[c.command] = hit.data.out ?? "";
  }
  return out;
}

export function staleCustom(
  commands: { command: string; ttlMs: number }[]
): string[] {
  return commands
    .filter((c) => {
      if (!c.command) return false;
      const hit = cacheRead<{ out: string }>(keyOf(c.command), CACHE_DIR);
      return !hit || hit.ageMs > c.ttlMs;
    })
    .map((c) => c.command);
}
