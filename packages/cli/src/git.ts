import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Walk up for a .git entry (a directory normally, a file in linked worktrees). */
export function findGitRoot(start: string): string | null {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Tier 1: read .git/HEAD directly. No subprocess, so no index.lock race with
 * an interactive shell and no 5-50ms fork on the render path.
 */
export function readBranch(gitRoot: string): string | null {
  try {
    let gitDir = join(gitRoot, ".git");
    if (statSync(gitDir).isFile()) {
      // linked worktree: ".git" is a file containing "gitdir: <path>"
      const m = readFileSync(gitDir, "utf8").match(/^gitdir:\s*(.+)$/m);
      if (!m) return null;
      gitDir = resolve(gitRoot, m[1]!.trim());
    }
    const head = readFileSync(join(gitDir, "HEAD"), "utf8").trim();
    const ref = head.match(/^ref:\s*refs\/heads\/(.+)$/);
    if (ref) return ref[1]!;
    return head.length >= 7 ? `detached@${head.slice(0, 7)}` : null;
  } catch {
    return null;
  }
}
