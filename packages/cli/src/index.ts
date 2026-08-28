#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseConfig, safeParseConfig, renderAnsi, type ClaudeStdin, type RuntimeData } from "@statusline/core";
import { DEFAULT_CONFIG } from "./defaultConfig.js";
import { findGitRoot, readBranch } from "./git.js";

const CONFIG_PATH = join(homedir(), ".config", "statusline", "config.json");

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return parseConfig(DEFAULT_CONFIG);
  try {
    const parsed = safeParseConfig(JSON.parse(readFileSync(CONFIG_PATH, "utf8")));
    if (!parsed.success) {
      process.stderr.write(`statusline: config invalid, using default\n${parsed.error.issues
        .slice(0, 3).map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}\n`);
      return parseConfig(DEFAULT_CONFIG);
    }
    return parsed.data;
  } catch {
    return parseConfig(DEFAULT_CONFIG);
  }
}

function readStdin(): ClaudeStdin {
  try {
    const raw = readFileSync(0, "utf8");
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as ClaudeStdin) : {};
  } catch {
    return {};
  }
}

function cmdRender() {
  const cc = readStdin();
  let cfg;
  try {
    cfg = loadConfig();
  } catch {
    cfg = parseConfig(DEFAULT_CONFIG);
  }
  // tput cols cannot work: Claude Code captures stdout instead of attaching a
  // TTY. $COLUMNS is the only reliable source. 0 means "unknown, do not drop".
  const columns = Number.parseInt(process.env.COLUMNS ?? "", 10) || 0;
  const cwd = cc.workspace?.current_dir ?? cc.cwd ?? process.cwd();
  const gitRoot = findGitRoot(cwd);
  const data: RuntimeData = {
    cc,
    local: { now: new Date(), home: homedir(), gitRoot: gitRoot ?? undefined,
             gitBranch: gitRoot ? readBranch(gitRoot) ?? undefined : undefined },
    columns,
  };
  const lines = renderAnsi(cfg, data);
  process.stdout.write(lines.join("\n") + (lines.length ? "\n" : ""));
  if (!lines.length) process.stdout.write((cc.model?.display_name ?? "Claude") + "\n");
}

function main() {
  const cmd = process.argv[2] ?? "render";
  try {
    if (cmd === "render") return cmdRender();
    if (cmd === "--version" || cmd === "version") return void process.stdout.write("0.1.0\n");
    process.stderr.write(`unknown command: ${cmd}\nusage: statusline render\n`);
    process.exitCode = 0; // never non-zero: a non-zero exit blanks the bar
  } catch (err) {
    // Last-resort fallback. A crash or non-zero exit blanks the status line
    // completely, so degrade to the model name and still exit 0.
    let name = "Claude";
    try { name = readStdin().model?.display_name ?? "Claude"; } catch { /* ignore */ }
    process.stdout.write(`${name}\n`);
  }
}
main();
