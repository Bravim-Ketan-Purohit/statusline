#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import {
  parseConfig, safeParseConfig, renderAnsi, renderTmux,
  type ClaudeStdin, type RuntimeData, type Config,
} from "@statusline/core";
import { DEFAULT_CONFIG } from "./defaultConfig.js";
import { findGitRoot, readBranch } from "./git.js";
import { CONFIG_PATH } from "./paths.js";
import { getCached } from "./cache.js";
import { doRefresh, type GitData, type GhData, type CiData, type SkillsData } from "./producers.js";
import { readPersonal, readSystem, readMedia } from "./local.js";
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
                             "git-stash", "git-sha", "git-diff", "repo-slug"]);
  const wantGh = ANY(used, ["gh-pr-counts", "gh-issues"]);
  const wantCi = used.has("ci");
  const wantSkills = used.has("skills");
  const root = (wantGit || wantGh || wantCi || wantSkills) ? findGitRoot(cwd) : null;

  const git = wantGit && root ? getCached<GitData>("git", root, TTL.git) : {};
  const gh = wantGh && root ? getCached<GhData>("gh", root, TTL.gh) : {};
  const ci = wantCi && root ? getCached<CiData>("ci", root, TTL.ci) : {};
  const skills = wantSkills && root ? (getCached<SkillsData>("skills", root, TTL.skills).recs ?? []) : [];

  return {
    cc,
    local: {
      now: new Date(), home: homedir(),
      gitRoot: root ?? undefined,
      gitBranch: git.branch || (wantGit && root ? readBranch(root) ?? undefined : undefined),
    },
    columns,
    git, gh, ci,
    personal: readPersonal(
      { verses: used.has("verse"), tracks: used.has("track") }, skills),
    system: readSystem(root, cwd, used.has("battery")),
    media: {},   // filled only by the tmux path, which can afford the call
  };
}

const cols = () => Number.parseInt(process.env.COLUMNS ?? "", 10) || 0;

function cmdRender() {
  const cc = readStdin();
  const cfg = loadConfig();
  const lines = renderAnsi(cfg, collect(cc, cols(), cfg));
  if (lines.length) process.stdout.write(lines.join("\n") + "\n");
  else process.stdout.write((cc.model?.display_name ?? "Claude") + "\n");
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
  daemon [--port N]      loopback listener so OSC 8 links can reach actions
  import <base64>        write config and patch ~/.claude/settings.json
    --force                skip the confirmation on an existing statusLine
    --no-settings          write the config only
  export                 print the current config as base64
  action-url <id>        print the daemon URL for an action (needs a token)
  tiles                  list every available tile
  --version
`;

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] ?? "render";

  if (cmd === "--refresh") { doRefresh(argv[1]!, argv[2]!); return; }

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
