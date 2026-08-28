import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, copyFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { spawnSync } from "node:child_process";
import { parseConfig, safeParseConfig, type Config } from "@statusline/core";
import { CONFIG_DIR, CONFIG_PATH, CLAUDE_SETTINGS } from "./paths.js";

const enc = (s: string) => Buffer.from(s, "utf8").toString("base64");
const dec = (s: string) => Buffer.from(s, "base64").toString("utf8");

/** Strip credentials before anything leaves the machine. */
export function stripCredentials(cfg: Config): { config: Config; required: string[] } {
  const required = new Set<string>();
  const rows = cfg.rows.map((r) => ({
    ...r,
    tiles: r.tiles.map((t) => {
      const props = { ...t.props } as Record<string, unknown>;
      for (const k of Object.keys(props)) {
        if (/token|secret|key|password|credential/i.test(k)) {
          required.add(t.type);
          delete props[k];
        }
      }
      return { ...t, props };
    }),
  }));
  return { config: { ...cfg, rows }, required: [...required] };
}

export function exportBase64(cfg: Config): string {
  const { config, required } = stripCredentials(cfg);
  const payload = required.length ? { ...config, requiredCredentials: required } : config;
  return enc(JSON.stringify(payload));
}

function atomicWrite(path: string, data: string) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const tmp = path + ".tmp";
  writeFileSync(tmp, data, { mode: 0o600 });
  renameSync(tmp, path);
}

function ask(q: string): Promise<string> {
  if (!process.stdin.isTTY) return Promise.resolve("y"); // non-interactive: proceed
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a.trim().toLowerCase()); }));
}

function unifiedDiff(a: string, b: string, la: string, lb: string): string {
  const A = a.split("\n"), B = b.split("\n");
  const out = [`--- ${la}`, `+++ ${lb}`];
  // Small files; a line-by-line walk is clearer than an LCS here.
  const max = Math.max(A.length, B.length);
  for (let i = 0; i < max; i++) {
    if (A[i] === B[i]) continue;
    if (A[i] !== undefined) out.push(`- ${A[i]}`);
    if (B[i] !== undefined) out.push(`+ ${B[i]}`);
  }
  return out.join("\n");
}

/**
 * Merge, never overwrite: read the existing settings, set only statusLine,
 * write it back. A pre-existing statusLine gets a diff and a confirmation.
 */
/**
 * Resolve how Claude Code should invoke us. A bare `statusline` only works if
 * the binary is on PATH; when it is not, point at this exact script so the
 * status line works immediately instead of silently blanking.
 */
export function resolveCommand(): string {
  const onPath = spawnSync(process.platform === "win32" ? "where" : "which",
    ["statusline"], { encoding: "utf8" }).status === 0;
  if (onPath) return "statusline render";
  const self = process.argv[1];
  return self ? `${process.execPath} ${self} render` : "statusline render";
}

export async function patchClaudeSettings(force: boolean): Promise<"written" | "skipped" | "created"> {
  const block = {
    type: "command" as const,
    command: resolveCommand(),
    padding: 0,
    refreshInterval: 5,
  };

  if (!existsSync(CLAUDE_SETTINGS)) {
    mkdirSync(CLAUDE_SETTINGS.replace(/\/settings\.json$/, ""), { recursive: true });
    writeFileSync(CLAUDE_SETTINGS, JSON.stringify({ statusLine: block }, null, 2) + "\n");
    return "created";
  }

  const raw = readFileSync(CLAUDE_SETTINGS, "utf8");
  let existing: Record<string, unknown>;
  try {
    existing = JSON.parse(raw);
  } catch {
    process.stderr.write(`statusline: ${CLAUDE_SETTINGS} is not valid JSON; refusing to touch it.\n`);
    return "skipped";
  }

  const before = JSON.stringify(existing, null, 2);
  const next = { ...existing, statusLine: block };
  const after = JSON.stringify(next, null, 2);
  if (before === after) return "skipped";

  if (existing.statusLine && !force) {
    process.stderr.write("\nstatusline: ~/.claude/settings.json already defines a statusLine.\n\n");
    process.stderr.write(unifiedDiff(before, after, "settings.json (current)", "settings.json (proposed)") + "\n\n");
    const a = await ask("Apply this change? [y/N] ");
    if (a !== "y" && a !== "yes") {
      process.stderr.write("statusline: left settings.json unchanged.\n");
      return "skipped";
    }
  }

  copyFileSync(CLAUDE_SETTINGS, `${CLAUDE_SETTINGS}.bak.${Date.now()}`);
  const tmp = CLAUDE_SETTINGS + ".tmp";
  writeFileSync(tmp, after + "\n");
  renameSync(tmp, CLAUDE_SETTINGS);
  return "written";
}

export async function cmdImport(arg: string | undefined, opts: { force: boolean; noSettings: boolean }) {
  if (!arg) {
    process.stderr.write("usage: statusline import <base64>\n");
    return 1;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(dec(arg));
  } catch {
    process.stderr.write("statusline: could not decode that payload (expected base64 JSON).\n");
    return 1;
  }
  const result = safeParseConfig(parsed);
  if (!result.success) {
    process.stderr.write("statusline: config failed validation:\n");
    for (const i of result.error.issues.slice(0, 6)) {
      process.stderr.write(`  ${i.path.join(".") || "(root)"}: ${i.message}\n`);
    }
    return 1;
  }
  const cfg = result.data;
  const req = (parsed as { requiredCredentials?: string[] }).requiredCredentials ?? [];

  atomicWrite(CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n");
  process.stderr.write(`statusline: wrote ${CONFIG_PATH}\n`);

  if (!opts.noSettings) {
    const r = await patchClaudeSettings(opts.force);
    if (r === "written") process.stderr.write(`statusline: patched ${CLAUDE_SETTINGS} (backup alongside)\n`);
    if (r === "created") process.stderr.write(`statusline: created ${CLAUDE_SETTINGS}\n`);
  }
  if (req.length) {
    process.stderr.write(`\nstatusline: this config needs credentials for: ${req.join(", ")}\n`);
    process.stderr.write(`  add them to ${CONFIG_DIR}/credentials.json (mode 0600)\n`);
  }
  return 0;
}

export function cmdExport(): number {
  let cfg: Config;
  try {
    cfg = parseConfig(JSON.parse(readFileSync(CONFIG_PATH, "utf8")));
  } catch {
    process.stderr.write(`statusline: no config at ${CONFIG_PATH}\n`);
    return 1;
  }
  process.stdout.write(exportBase64(cfg) + "\n");
  return 0;
}
