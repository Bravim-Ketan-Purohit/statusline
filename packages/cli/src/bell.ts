import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CACHE_DIR } from "./cache.js";

/**
 * Terminal bell on escalation.
 *
 * A status line re-renders constantly, so ringing whenever a rule is firing
 * would ring forever. The bell fires only on the transition into firing, which
 * means remembering the last state across processes -- hence the small file.
 */
const STATE = join(CACHE_DIR, "bell-state.json");

function load(): Record<string, boolean> {
  try { return JSON.parse(readFileSync(STATE, "utf8")); } catch { return {}; }
}

/** Returns true when the bell should sound right now. */
export function shouldRing(firing: string[]): boolean {
  const prev = load();
  const now: Record<string, boolean> = {};
  let rising = false;
  for (const sig of firing) {
    now[sig] = true;
    if (!prev[sig]) rising = true;   // was not firing, now is
  }
  try { writeFileSync(STATE, JSON.stringify(now)); } catch { /* best effort */ }
  return rising;
}
