import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir, hostname } from "node:os";
import { run, getCached } from "./cache.js";
import type { PersonalInfo, SystemInfo, MediaInfo } from "@statusline/core";

const readJson = <T,>(p: string): T | null => {
  try {
    const v = JSON.parse(readFileSync(p, "utf8"));
    return Array.isArray(v) && v.length ? (v as T) : null;
  } catch { return null; }
};

/** Tier 1: local files only. Missing or malformed means the tile disappears. */
export function readPersonal(
  want: { verses: boolean; tracks: boolean }, skills: string[]
): PersonalInfo {
  return {
    verses: want.verses ? readJson(join(homedir(), ".claude", "quotes.json")) ?? undefined : undefined,
    tracks: want.tracks ? readJson(join(homedir(), ".claude", "playlist.json")) ?? undefined : undefined,
    skills,
  };
}

const firstLine = (p: string) => {
  try { return readFileSync(p, "utf8").trim().split("\n")[0]!.trim(); } catch { return ""; }
};

/**
 * `wantBattery` gates the one expensive call in here. Reading the battery
 * shells out (pmset on macOS), so it happens only when a battery tile is
 * actually on the sheet, and then through the cache like every other
 * subprocess. Everything else is a file read or an env lookup.
 */
export function readSystem(root: string | null, cwd: string, wantBattery: boolean): SystemInfo {
  const base = root ?? cwd;
  const ve = process.env.VIRTUAL_ENV;
  const py = firstLine(join(base, ".python-version"));
  const nv = firstLine(join(base, ".nvmrc")) || firstLine(join(base, ".node-version"));
  return {
    hostname: hostname().split(".")[0],
    venv: ve ? ve.replace(/\/+$/, "").split("/").pop() : undefined,
    pythonVersion: py || undefined,
    nodeVersion: nv ? nv.replace(/^v/, "") : undefined,
    battery: wantBattery ? getCached<{ battery: SystemInfo["battery"] }>("battery", "system", 60_000).battery : undefined,
  };
}

/** Producer form, run only inside the detached refresh. */
export function produceBattery() {
  return { battery: readBattery() };
}

function readBattery(): SystemInfo["battery"] {
  if (process.platform === "darwin") {
    const out = run("pmset", ["-g", "batt"], undefined, 2000);
    const m = /(\d+)%.*?;\s*([a-z ]+)/i.exec(out);
    if (!m) return undefined;
    return { percent: Number(m[1]), charging: /charg|ac attached/i.test(m[2] ?? "") };
  }
  const base = "/sys/class/power_supply";
  for (const n of ["BAT0", "BAT1"]) {
    const cap = join(base, n, "capacity"), st = join(base, n, "status");
    if (!existsSync(cap)) continue;
    const percent = Number(firstLine(cap));
    if (!Number.isFinite(percent)) continue;
    return { percent, charging: /charging|full/i.test(firstLine(st)) };
  }
  return undefined;
}

/** Now-playing, best effort, short timeout, never on the render path. */
export function readMedia(): MediaInfo {
  if (process.platform === "darwin") {
    const s = run("osascript", ["-e",
      'tell application "Music" to if it is running then return (get name of current track) & " — " & (get artist of current track) & " — " & (player state as text)',
    ], undefined, 2500);
    if (!s) return {};
    const [title, artist, state] = s.split(" — ");
    return { title, artist, playing: (state ?? "").includes("playing") };
  }
  const title = run("playerctl", ["metadata", "title"], undefined, 2000);
  if (!title) return {};
  return {
    title,
    artist: run("playerctl", ["metadata", "artist"], undefined, 2000) || undefined,
    playing: run("playerctl", ["status"], undefined, 2000).toLowerCase() === "playing",
  };
}
