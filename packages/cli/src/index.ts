#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import {
  parseConfig, safeParseConfig, renderAnsi, renderTmux,
  signalActive,
  type ClaudeStdin, type RuntimeData, type Config, type SignalId,
} from "@statusline/core";
import { DEFAULT_CONFIG } from "./defaultConfig.js";
import { findGitRoot, readBranch } from "./git.js";
import { CONFIG_PATH } from "./paths.js";
import { getCached, spawnDetached, CACHE_DIR } from "./cache.js";
import { readdirSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { doRefresh, type GitData, type GhData, type CiData, type SkillsData } from "./producers.js";
import { readPersonal, readSystem, readMedia } from "./local.js";
import { readMetrics, metricsAreStale } from "./metrics.js";
import { shouldRing } from "./bell.js";
import { cmdDoctor } from "./doctor.js";
import { findDrill, runDrill, popupCommand } from "./drill.js";
import { collectCustom, staleCustom, refreshCustom, toArgv } from "./custom.js";
import { loadApprovals, approve, revokeAll, isApproved, hashArgv, APPROVALS_PATH } from "./approvals.js";
import { setCredential, deleteCredential, listCredentialNames } from "./credentials.js";
import { CREDENTIALS_PATH } from "./paths.js";
import { cmdImport, cmdExport } from "./handoff.js";
import { dispatch, isAction, TMUX_ALIAS, ACTIONS } from "./actions.js";
import { startDaemon, loadOrCreateToken, actionUrl } from "./daemon.js";
import { printTmuxConf } from "./tmuxconf.js";

const TTL = { git: 4_000, gh: 180_000, ci: 180_000, skills: 240_000 };

function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) return parseConfig(DEFAULT_CONFIG);
  try {
    const parsed = safeParseConfig(JSON.parse(readFileSync(CONFIG_PATH, "utf8")));
    if (parsed.success) return parsed.data;
    process.stderr.write("statusline: config invalid, using default\n");
  } catch { /* unreadable */ }
  return parseConfig(DEFAULT_CONFIG);
}

function readStdin(): ClaudeStdin {
  try {
    const v = JSON.parse(readFileSync(0, "utf8"));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as ClaudeStdin) : {};
  } catch { return {}; }
}

/** Which tile types the config actually uses, so nothing else is collected. */
function usedTypes(cfg: Config): Set<string> {
  return new Set(cfg.rows.flatMap((r) => r.tiles.map((t) => t.type)));
}

const ANY = (used: Set<string>, ids: string[]) => ids.some((i) => used.has(i));

/**
 * Assemble everything a tile can read. Nothing here blocks on the network,
 * and nothing is collected that no tile on the sheet asked for -- a config
 * with no git tiles never spawns a git refresh.
 */
function collect(cc: ClaudeStdin, columns: number, cfg: Config): RuntimeData {
  const cwd = cc.workspace?.current_dir ?? cc.cwd ?? process.cwd();
  const used = usedTypes(cfg);
  const wantGit = ANY(used, ["git-branch", "git-counts", "git-ahead-behind", "git-last-commit",
                             "git-stash", "git-sha", "git-diff", "repo-slug", "protected-branch"]);
  const wantGh = ANY(used, ["gh-pr-counts", "gh-issues"]);
  const wantCi = used.has("ci");
  const wantSkills = used.has("skills");
  const root = (wantGit || wantGh || wantCi || wantSkills) ? findGitRoot(cwd) : null;

  const git = wantGit && root ? getCached<GitData>("git", root, TTL.git) : {};
  const gh = wantGh && root ? getCached<GhData>("gh", root, TTL.gh) : {};
  const ci = wantCi && root ? getCached<CiData>("ci", root, TTL.ci) : {};
  const skills = wantSkills && root ? (getCached<SkillsData>("skills", root, TTL.skills).recs ?? []) : [];

  // Custom commands: read what is cached, and fire a detached refresh for
  // anything stale. Nothing here waits on a subprocess.
  const cmdTiles = cfg.rows.flatMap((r) => r.tiles)
    .filter((t) => t.type === "command")
    .map((t) => ({
      command: String((t.props as Record<string, unknown>).command ?? ""),
      ttlMs: Number((t.props as Record<string, unknown>).ttl ?? 30) * 1000,
    }))
    .filter((c) => c.command);
  const custom: Record<string, string> = cmdTiles.length ? collectCustom(cmdTiles) : {};
  // Safety tiles need the theme's patterns, which do not live on RuntimeData.
  custom["__danger"] = JSON.stringify(cfg.theme.dangerPatterns);
  custom["__protected"] = JSON.stringify(cfg.theme.protectedBranches);
  for (const stale of staleCustom(cmdTiles)) {
    spawnDetached(["--refresh-cmd", stale, String(columns)]);
  }

  return {
    cc,
    custom,
    local: {
      now: new Date(), home: homedir(),
      gitRoot: root ?? undefined,
      gitBranch: git.branch || (wantGit && root ? readBranch(root) ?? undefined : undefined),
    },
    columns,
    git, gh, ci,
    personal: readPersonal(
      { verses: used.has("verse"), tracks: used.has("track") }, skills),
    system: readSystem(root, cwd, {
      battery: used.has("battery"),
      kube: used.has("kube-context"),
      aws: used.has("aws-profile"),
      gcp: used.has("gcp-project"),
    }),
    media: {},   // filled only by the tmux path, which can afford the call
    // Absent when the daemon is not running, or its file has gone stale.
    metrics: ANY(used, ["cpu","memory","swap","disk","load","network","gpu","vram"])
      ? readMetrics() : undefined,
  };
}

const cols = () => Number.parseInt(process.env.COLUMNS ?? "", 10) || 0;

/** Which signals are firing anywhere in the config right now. */
function buildFiring(cfg: Config, data: RuntimeData): SignalId[] {
  const out: SignalId[] = [];
  for (const row of cfg.rows) {
    for (const t of row.tiles) {
      for (const r of t.style.rules ?? []) {
        if (signalActive(r.signal, r.threshold, data)) out.push(r.signal);
      }
    }
  }
  return out;
}

function cmdRender() {
  const cc = readStdin();
  const cfg = loadConfig();
  const data = collect(cc, cols(), cfg);
  const lines = renderAnsi(cfg, data);
  if (lines.length) process.stdout.write(lines.join("\n") + "\n");
  else process.stdout.write((cc.model?.display_name ?? "Claude") + "\n");

  // Ring only on the transition into firing, so an alarm does not chime on
  // every redraw. Written to stderr: stdout is the status line itself.
  try {
    const wants = cfg.rows.flatMap((r) => r.tiles)
      .flatMap((t) => (t.style.rules ?? []).filter((x) => x.bell).map((x) => x.signal));
    if (wants.length) {
      const firing = [...new Set(
        buildFiring(cfg, data).filter((sig) => wants.includes(sig)))];
      // shouldRing must run even when nothing is firing, or the fall back to
      // calm is never recorded and the next incident stays silent forever.
      if (shouldRing(firing)) process.stderr.write("\u0007");
    }
  } catch { /* a bell is never worth failing a render for */ }
}

function cmdTmux() {
  const cfg = loadConfig();
  const data = collect({}, cfg.targets.tmux.maxWidth, cfg);
  data.media = readMedia();
  process.stdout.write(renderTmux(cfg, data) + "\n");
}

function cmdAction(raw: string | undefined) {
  const id = TMUX_ALIAS[(raw ?? "").trim()] ?? (raw ?? "").trim();
  if (!isAction(id)) {
    process.stderr.write(`statusline: unknown action "${raw}"; allowed: ${ACTIONS.join(", ")}\n`);
    return 0;   // never non-zero from a tmux run-shell binding
  }
  const r = dispatch(id);
  if (!r.ok) process.stderr.write(`statusline: ${r.detail}\n`);
  return 0;
}

const HELP = `statusline — one design, three render targets

  render                 read Claude Code stdin JSON, print the status line
  tmux                   print a tmux format string for status-left/right
  tmux-conf              print the .tmux.conf snippet (mouse + click binding)
  action <id>            run a media action: ${ACTIONS.join(", ")}
  click <range>          tmux click router: "d:<id>" drills, else acts
  view <id>              run a tile's drill command (what the popup runs)
  refresh                expire every cache so the next render repopulates
  approve [--yes]        review and approve the config's custom commands
    --list                 show what is already approved
    --revoke-all           revoke every approval
  daemon [--port N]      loopback listener so OSC 8 links can reach actions
  import <base64>        write config and patch ~/.claude/settings.json
    --force                skip the confirmation on an existing statusLine
    --no-settings          write the config only
  export                 print the current config as base64
  creds list             list credential names (never values)
  creds set <n> [v]      store one; omit v and pass STATUSLINE_CREDENTIAL
  creds rm <n>           remove one
  action-url <id>        print the daemon URL for an action (needs a token)
  tiles                  list every available tile
  doctor                 report what is misconfigured, and how to fix it
  --version
`;

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] ?? "render";

  if (cmd === "--refresh") { doRefresh(argv[1]!, argv[2]!); return; }
  if (cmd === "--refresh-cmd") { refreshCustom(argv[1]!, Number(argv[2]) || 0); return; }

  try {
    switch (cmd) {
      case "render": return cmdRender();
      case "tmux": return cmdTmux();
      case "tmux-conf": return printTmuxConf(loadConfig());
      case "action": { process.exitCode = cmdAction(argv[1]); return; }
      case "daemon": {
        const i = argv.indexOf("--port");
        const port = i !== -1 ? Number(argv[i + 1]) : loadConfig().daemon.port;
        await startDaemon(port);
        return;
      }
      case "action-url": {
        const cfg = loadConfig();
        const { token, port } = loadOrCreateToken(cfg.daemon.port);
        process.stdout.write(actionUrl(port, token, argv[1] ?? "play_pause") + "\n");
        return;
      }
      case "import": {
        process.exitCode = await cmdImport(argv[1], {
          force: argv.includes("--force"), noSettings: argv.includes("--no-settings"),
        });
        return;
      }
      case "export": { process.exitCode = cmdExport(); return; }
      case "doctor": { process.exitCode = cmdDoctor(); return; }
      case "click": {
        // One binding for both meanings: "d:<id>" drills, anything else acts.
        const raw = (argv[1] ?? "").trim();
        if (raw.startsWith("d:")) {
          const id = raw.slice(2);
          const d = findDrill(loadConfig(), id);
          if (!d) return;
          const self = process.argv[1] ? `${process.execPath} ${process.argv[1]}` : "statusline";
          spawnSync("tmux", popupCommand(self, id, d.title), { stdio: "ignore" });
          return;
        }
        process.exitCode = cmdAction(raw);
        return;
      }
      case "view": {
        const d = findDrill(loadConfig(), argv[1] ?? "");
        if (!d) { process.stdout.write(`no drill with id "${argv[1] ?? ""}"\n`); return; }
        process.exitCode = runDrill(d);
        return;
      }
      case "refresh": {
        // Expire every cache so the next render repopulates from scratch.
        try {
          const dir = CACHE_DIR;
          for (const f of readdirSync(dir)) {
            if (f.endsWith(".json")) utimesSync(join(dir, f), new Date(0), new Date(0));
          }
          process.stdout.write("caches expired; the next render refreshes\n");
        } catch { process.stdout.write("nothing to refresh\n"); }
        return;
      }
      case "creds": {
        const sub = argv[1];
        if (sub === "list") {
          const names = listCredentialNames();
          if (!names.length) process.stdout.write("no credentials stored\n");
          // Names only, never values.
          for (const n of names) process.stdout.write(n + "\n");
          return;
        }
        if (sub === "set" && argv[2]) {
          const value = argv[3] ?? process.env.STATUSLINE_CREDENTIAL;
          if (!value) {
            process.stderr.write(
              "usage: statusline creds set <name> <value>\n" +
              "   or: STATUSLINE_CREDENTIAL=... statusline creds set <name>\n" +
              "       (the env form keeps the value out of your shell history)\n");
            process.exitCode = 1; return;
          }
          setCredential(argv[2], value);
          process.stdout.write(`stored ${argv[2]} in ${CREDENTIALS_PATH} (mode 0600)\n`);
          return;
        }
        if (sub === "rm" && argv[2]) {
          process.stdout.write(deleteCredential(argv[2]) ? `removed ${argv[2]}\n` : `no such credential\n`);
          return;
        }
        process.stderr.write("usage: statusline creds <list|set <name> [value]|rm <name>>\n");
        process.exitCode = 1; return;
      }
      case "approve": {
        const cfgNow = loadConfig();
        // Both kinds of runnable command need approval: a custom command tile
        // and a drill. Missing the second meant a drill could never be run.
        const tilesNow = cfgNow.rows.flatMap((r) => r.tiles);
        const cmds = [...new Set([
          ...tilesNow.filter((t) => t.type === "command")
            .map((t) => String((t.props as Record<string, unknown>).command ?? "")),
          ...tilesNow.filter((t) => t.drill).map((t) => t.drill!.command.join(" ")),
        ].filter(Boolean))];
        if (argv[1] === "--list") {
          const list = loadApprovals();
          if (!list.length) process.stdout.write("no approved commands\n");
          for (const a of list) process.stdout.write(`${a.hash}  ${a.command}\n`);
          return;
        }
        if (argv[1] === "--revoke-all") { revokeAll(); process.stdout.write("all approvals revoked\n"); return; }
        if (!cmds.length) { process.stdout.write("no command tiles in the config\n"); return; }
        const drillArgvs = tilesNow.filter((t) => t.drill).map((t) => t.drill!.command);
        const pending = [
          ...cmds.filter((c) => !isApproved(toArgv(c)) &&
            !drillArgvs.some((d) => d.join(" ") === c)),
          ...drillArgvs.filter((d) => !isApproved(d)).map((d) => d.join(" ")),
        ];
        if (!pending.length) { process.stdout.write("every command tile is already approved\n"); return; }
        process.stdout.write("These commands run on your machine on every refresh:\n\n");
        for (const c of pending) {
          process.stdout.write(`  ${JSON.stringify(toArgv(c))}\n`);
        }
        process.stdout.write(`\nApproving stores a hash in ${APPROVALS_PATH}. Editing a command revokes it.\n`);
        if (argv.includes("--yes")) {
          for (const c of pending) approve(toArgv(c), c);
          // A drill carries its argv verbatim, so hash that rather than a
          // re-split of the joined string, which can differ on quoting.
          for (const t of tilesNow) if (t.drill) approve(t.drill.command, t.drill.command.join(" "));
          process.stdout.write(`\napproved ${pending.length}\n`);
        } else {
          process.stdout.write("\nRe-run with --yes to approve them.\n");
          process.exitCode = 1;
        }
        return;
      }
      case "tiles": {
        const { allTiles } = await import("@statusline/core");
        for (const t of allTiles()) {
          process.stdout.write(`${t.id.padEnd(20)} T${t.tier}  ${t.category.padEnd(12)} ${t.displayName}\n`);
        }
        return;
      }
      case "--version": case "version": return void process.stdout.write("0.1.0\n");
      case "--help": case "-h": case "help": return void process.stdout.write(HELP);
      default:
        process.stderr.write(`unknown command: ${cmd}\n\n${HELP}`);
        return;
    }
  } catch {
    // A crash or non-zero exit blanks the status line, so render degrades to
    // the model name and still exits 0. Other commands simply report nothing.
    if (cmd === "render" || cmd === "tmux") {
      let name = "Claude";
      try { name = readStdin().model?.display_name ?? "Claude"; } catch { /* ignore */ }
      process.stdout.write(name + "\n");
    }
    process.exitCode = 0;
  }
}
main();
