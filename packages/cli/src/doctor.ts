import { existsSync, statSync } from "node:fs";
import { allTiles, safeParseConfig, type Config } from "@statusline/core";
import { CONFIG_PATH, CREDENTIALS_PATH, CLAUDE_SETTINGS, DAEMON_PATH } from "./paths.js";
import { APPROVALS_PATH, loadApprovals, isApproved } from "./approvals.js";
import { listCredentialNames } from "./credentials.js";
import { metricsAreStale } from "./metrics.js";
import { toArgv } from "./custom.js";
import { cacheRead, CACHE_DIR, has } from "./cache.js";
import { readFileSync } from "node:fs";

/**
 * Reports what is wrong and how to fix it, one line each.
 *
 * The failure mode this exists for is silence: a tile that renders nothing
 * looks identical whether its data is absent, its credential is missing, or
 * the daemon is not running. Doctor tells them apart.
 */

export interface Finding { level: "ok" | "warn" | "fail"; what: string; fix?: string }

const MARK = { ok: "  ok  ", warn: " warn ", fail: " fail " };

/** Which extra service a tile needs, so a missing one can be named. */
const NEEDS: Record<string, string> = {
  ci: "gh", "gh-pr-counts": "gh", "gh-issues": "gh",
  "kube-context": "kubectl", "gcp-project": "gcloud",
};
const METRIC_TILES = new Set(["cpu", "memory", "swap", "disk", "load", "network", "gpu", "vram"]);

export function diagnose(): Finding[] {
  const f: Finding[] = [];

  // --- config ---
  if (!existsSync(CONFIG_PATH)) {
    f.push({ level: "warn", what: `no config at ${CONFIG_PATH}`,
             fix: "the built-in default is being used; run `statusline import <base64>` from the builder" });
  } else {
    try {
      const parsed = safeParseConfig(JSON.parse(readFileSync(CONFIG_PATH, "utf8")));
      if (parsed.success) {
        f.push({ level: "ok", what: `config valid (v${parsed.data.version}, ${parsed.data.rows.length} rows)` });
        f.push(...diagnoseConfig(parsed.data));
      } else {
        f.push({ level: "fail", what: "config fails validation, so the default is rendering instead",
                 fix: parsed.error.issues.slice(0, 2).map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ") });
      }
    } catch (e) {
      f.push({ level: "fail", what: "config is not valid JSON", fix: (e as Error).message });
    }
  }

  // --- how Claude Code invokes us ---
  if (!existsSync(CLAUDE_SETTINGS)) {
    f.push({ level: "warn", what: "~/.claude/settings.json does not exist",
             fix: "run `statusline import` to create it, or add the statusLine key by hand" });
  } else {
    try {
      const cc = JSON.parse(readFileSync(CLAUDE_SETTINGS, "utf8")) as Record<string, any>;
      const sl = cc.statusLine;
      if (!sl) f.push({ level: "warn", what: "settings.json has no statusLine key", fix: "run `statusline import`" });
      // Matching "statusline" alone is too loose: an unrelated statusline.py
      // would pass. Our command always ends in the `render` subcommand.
      else if (!/statusline(\.js)?["']?\s+render\b/.test(String(sl.command ?? "")))
        f.push({ level: "warn", what: `statusLine runs something else: ${String(sl.command).slice(0, 60)}`,
                 fix: "that may be intentional; run `statusline import` to point it here" });
      else {
        f.push({ level: "ok", what: "settings.json statusLine points here" });
        if (!sl.refreshInterval)
          f.push({ level: "warn", what: "no refreshInterval set",
                   fix: "clocks, countdowns and animated fills only advance on a redraw; set it to 5" });
      }
    } catch { f.push({ level: "fail", what: "settings.json is not valid JSON", fix: "fix it before importing" }); }
  }

  // --- daemon ---
  f.push(existsSync(DAEMON_PATH)
    ? { level: "ok", what: "daemon token present" }
    : { level: "warn", what: "no daemon token yet", fix: "created on first `statusline daemon`" });

  // --- credentials ---
  const creds = listCredentialNames();
  if (existsSync(CREDENTIALS_PATH)) {
    const mode = statSync(CREDENTIALS_PATH).mode & 0o777;
    if (mode & 0o077) f.push({ level: "fail", what: `credentials.json is mode ${mode.toString(8)} and will not be loaded`,
                               fix: `chmod 600 ${CREDENTIALS_PATH}` });
    else f.push({ level: "ok", what: `${creds.length} credential(s) stored: ${creds.join(", ") || "none"}` });
  }
  if (existsSync(APPROVALS_PATH)) {
    const mode = statSync(APPROVALS_PATH).mode & 0o777;
    if (mode & 0o077) f.push({ level: "fail", what: `approved-commands.json is mode ${mode.toString(8)}; approvals ignored`,
                               fix: `chmod 600 ${APPROVALS_PATH}` });
  }
  return f;
}

function diagnoseConfig(cfg: Config): Finding[] {
  const f: Finding[] = [];
  const used = [...new Set(cfg.rows.flatMap((r) => r.tiles).map((t) => t.type))];
  const known = new Set(allTiles().map((t) => t.id));

  const unknown = used.filter((t) => !known.has(t));
  if (unknown.length)
    f.push({ level: "fail", what: `unknown tile type(s): ${unknown.join(", ")}`,
             fix: "they are skipped at render time; run `statusline tiles` for the list" });

  // external tools a configured tile depends on
  for (const [tile, tool] of Object.entries(NEEDS)) {
    if (used.includes(tile) && !has(tool))
      f.push({ level: "warn", what: `tile "${tile}" needs ${tool}, which is not installed`,
               fix: `install ${tool}, or the tile will stay silent` });
  }

  if (used.some((t) => METRIC_TILES.has(t))) {
    f.push(metricsAreStale()
      ? { level: "warn", what: "metric tiles are configured but no fresh sample exists",
          fix: "run `statusline daemon` — the renderer never samples, so without it they stay blank" }
      : { level: "ok", what: "metrics sample is fresh" });
  }

  const cmds = cfg.rows.flatMap((r) => r.tiles).filter((t) => t.type === "command")
    .map((t) => String((t.props as Record<string, unknown>).command ?? "")).filter(Boolean);
  const pending = cmds.filter((c) => !isApproved(toArgv(c)));
  if (pending.length)
    f.push({ level: "warn", what: `${pending.length} custom command(s) not approved, so they will not run`,
             fix: "run `statusline approve` to review them" });
  else if (cmds.length)
    f.push({ level: "ok", what: `${cmds.length} custom command(s) approved (${loadApprovals().length} total)` });

  // cache freshness for the network-backed tiles
  for (const [kind, tiles] of [["gh", ["gh-pr-counts", "gh-issues"]], ["ci", ["ci"]]] as const) {
    if (!used.some((t) => (tiles as readonly string[]).includes(t))) continue;
    const root = cfg.meta.name;   // key is the git root at render time; presence is what matters
    const hit = cacheRead(kind, root);
    if (!hit) f.push({ level: "ok", what: `${kind} cache warms on the next render` });
  }
  return f;
}

export function cmdDoctor(): number {
  const findings = diagnose();
  for (const x of findings) {
    process.stdout.write(`[${MARK[x.level]}] ${x.what}\n`);
    if (x.fix) process.stdout.write(`          ${x.fix}\n`);
  }
  const fails = findings.filter((x) => x.level === "fail").length;
  const warns = findings.filter((x) => x.level === "warn").length;
  process.stdout.write(`\n${findings.length} checks · ${fails} failing · ${warns} warning\n`);
  return fails ? 1 : 0;
}
