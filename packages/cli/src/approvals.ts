import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { CONFIG_DIR } from "./paths.js";

/**
 * Command approval gate.
 *
 * A config is a shareable artifact -- the builder hands you a base64 blob to
 * paste. Running an argv array out of one without asking means a pasted config
 * is arbitrary code execution, and an argv-only policy does not prevent that:
 * nothing stops `sh` from being argv[0].
 *
 * So a command tile is inert until its exact argv has been approved on this
 * machine. Approval is keyed on a hash of the argv, which means editing the
 * command revokes it.
 */

export const APPROVALS_PATH = join(CONFIG_DIR, "approved-commands.json");

export interface Approval { hash: string; command: string; at: number }

export const hashArgv = (argv: string[]) =>
  createHash("sha256").update(JSON.stringify(argv)).digest("hex").slice(0, 16);

export function loadApprovals(): Approval[] {
  try {
    if (!existsSync(APPROVALS_PATH)) return [];
    const mode = statSync(APPROVALS_PATH).mode & 0o777;
    if (mode & 0o077) {
      process.stderr.write(
        `statusline: ${APPROVALS_PATH} is mode ${mode.toString(8)}; refusing to trust it. ` +
        `Run: chmod 600 ${APPROVALS_PATH}\n`);
      return [];
    }
    const v = JSON.parse(readFileSync(APPROVALS_PATH, "utf8"));
    return Array.isArray(v) ? (v as Approval[]) : [];
  } catch { return []; }
}

export function saveApprovals(list: Approval[]) {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(APPROVALS_PATH, JSON.stringify(list, null, 2) + "\n", { mode: 0o600 });
}

export function isApproved(argv: string[]): boolean {
  const h = hashArgv(argv);
  return loadApprovals().some((a) => a.hash === h);
}

export function approve(argv: string[], command: string) {
  const list = loadApprovals();
  const h = hashArgv(argv);
  if (list.some((a) => a.hash === h)) return;
  list.push({ hash: h, command, at: Date.now() });
  saveApprovals(list);
}

export function revokeAll() { saveApprovals([]); }
