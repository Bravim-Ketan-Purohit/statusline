import { spawnSync } from "node:child_process";
import type { Config } from "@statusline/core";
import { isApproved } from "./approvals.js";

/**
 * Drill-down.
 *
 * tmux hands back the range id on a click; `statusline click` routes it. A
 * range beginning "d:" is a drill and gets a popup, anything else is a media
 * action and runs inline. Only tmux can do this at all -- Claude Code has no
 * click, which the capability matrix reports rather than half-implementing.
 *
 * A drill runs a command, so it goes through the same approval gate as a
 * custom command. An unapproved drill opens a popup that says so instead of
 * running anything.
 */

export interface Drill { id: string; command: string[]; title?: string }

export function findDrill(cfg: Config, id: string): Drill | null {
  for (const row of cfg.rows) {
    for (const t of row.tiles) {
      if (t.drill && t.drill.id === id) return t.drill as Drill;
    }
  }
  return null;
}

/** Runs the drill command in the foreground; tmux's popup is the window. */
export function runDrill(d: Drill): number {
  if (!isApproved(d.command)) {
    process.stdout.write(
      `This drill is not approved, so it did not run.\n\n` +
      `  ${JSON.stringify(d.command)}\n\n` +
      `Approve it with:  statusline approve --yes\n`);
    return 1;
  }
  const r = spawnSync(d.command[0]!, d.command.slice(1), {
    stdio: "inherit", shell: false, timeout: 120_000,
  });
  return r.status ?? 1;
}

/** The tmux popup invocation for a given drill id. */
export function popupCommand(binary: string, id: string, title?: string): string[] {
  return [
    "display-popup", "-E", "-w", "80%", "-h", "80%",
    ...(title ? ["-T", title] : []),
    `${binary} view ${id}`,
  ];
}
