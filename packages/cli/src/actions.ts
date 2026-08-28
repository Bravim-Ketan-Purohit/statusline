import { spawnSync } from "node:child_process";
import { has } from "./cache.js";

/**
 * One executor, two entry points. tmux calls `statusline action <id>` directly
 * through run-shell; the daemon calls this same map from its HTTP handler.
 * Actions come from a fixed allowlist -- never a command string off the wire.
 */
export const ACTIONS = ["play_pause", "next", "prev", "vol_up", "vol_down"] as const;
export type ActionId = (typeof ACTIONS)[number];

export const isAction = (s: string): s is ActionId => (ACTIONS as readonly string[]).includes(s);

/** Short ids for tmux: range=user|X is capped at 15 bytes. */
export const TMUX_ALIAS: Record<string, ActionId> = {
  play: "play_pause", pause: "play_pause", play_pause: "play_pause",
  next: "next", prev: "prev", vol_up: "vol_up", vol_down: "vol_down",
};

const MAC: Record<ActionId, string[]> = {
  play_pause: ['tell application "Music" to playpause'],
  next: ['tell application "Music" to next track'],
  prev: ['tell application "Music" to previous track'],
  vol_up: ["set volume output volume (output volume of (get volume settings) + 7)"],
  vol_down: ["set volume output volume (output volume of (get volume settings) - 7)"],
};

const LINUX: Record<ActionId, string[]> = {
  play_pause: ["play-pause"], next: ["next"], prev: ["previous"],
  vol_up: ["volume", "0.07+"], vol_down: ["volume", "0.07-"],
};

export function backend(): "playerctl" | "applescript" | null {
  if (process.platform === "darwin") return "applescript";
  if (has("playerctl")) return "playerctl";
  return null;
}

export function dispatch(id: ActionId): { ok: boolean; detail: string } {
  const b = backend();
  if (!b) return { ok: false, detail: "no media backend (install playerctl, or run on macOS)" };
  const r = b === "applescript"
    ? spawnSync("osascript", ["-e", MAC[id][0]!], { encoding: "utf8", timeout: 4000 })
    : spawnSync("playerctl", LINUX[id], { encoding: "utf8", timeout: 4000 });
  return r.status === 0
    ? { ok: true, detail: `${b}: ${id}` }
    : { ok: false, detail: (r.stderr || `${b} exited ${r.status}`).trim().slice(0, 200) };
}
