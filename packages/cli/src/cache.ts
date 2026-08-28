import { mkdirSync, readFileSync, writeFileSync, renameSync, statSync, unlinkSync, openSync, closeSync, constants } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Never block the render. Read whatever is cached, and if it is stale spawn a
 * detached refresh and return the stale value this time. Cache keys derive
 * from the git root path, never a pid, or the cache silently never hits.
 */
export const CACHE_DIR = join(tmpdir(), `statusline-${process.getuid?.() ?? 0}`);
const LOCK_STALE_MS = 60_000;

const keyFor = (kind: string, root: string, ext: string) =>
  join(CACHE_DIR, `${kind}_${root.replace(/[^A-Za-z0-9]+/g, "_").slice(-80)}${ext}`);

function ensureDir() {
  try { mkdirSync(CACHE_DIR, { recursive: true, mode: 0o700 }); } catch { /* raced */ }
}

export function cacheRead<T>(kind: string, root: string): { data: T; ageMs: number } | null {
  try {
    const p = keyFor(kind, root, ".json");
    const data = JSON.parse(readFileSync(p, "utf8")) as T;
    return { data, ageMs: Date.now() - statSync(p).mtimeMs };
  } catch { return null; }
}

export function cacheWrite(kind: string, root: string, data: unknown) {
  ensureDir();
  const p = keyFor(kind, root, ".json");
  const tmp = keyFor(kind, root, ".tmp");
  writeFileSync(tmp, JSON.stringify(data));
  renameSync(tmp, p);            // atomic: readers never see a half file
}

function spawnRefresh(kind: string, root: string) {
  ensureDir();
  const lock = keyFor(kind, root, ".lock");
  try {
    const age = Date.now() - statSync(lock).mtimeMs;
    if (age > LOCK_STALE_MS) unlinkSync(lock);   // previous worker died
  } catch { /* no lock */ }
  try {
    closeSync(openSync(lock, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600));
  } catch { return; }            // somebody else is already refreshing
  try {
    // In the bundle this file IS the entry point; unbundled it sits beside it.
    const here = fileURLToPath(import.meta.url);
    const self = here.endsWith("statusline.js") ? here : here.replace(/cache\.js$/, "index.js");
    spawn(process.execPath, [self, "--refresh", kind, root], {
      detached: true, stdio: "ignore",
    }).unref();
  } catch {
    try { unlinkSync(lock); } catch { /* ignore */ }
  }
}

export function releaseLock(kind: string, root: string) {
  try { unlinkSync(keyFor(kind, root, ".lock")); } catch { /* ignore */ }
}

/** Returns instantly: the cached value, refreshing in the background if stale. */
export function getCached<T extends object>(kind: string, root: string, ttlMs: number): Partial<T> {
  const hit = cacheRead<T>(kind, root);
  if (!hit || hit.ageMs > ttlMs) spawnRefresh(kind, root);
  return (hit?.data ?? {}) as Partial<T>;
}

/** Synchronous command runner, only ever called inside a detached refresh. */
export function run(cmd: string, args: string[], cwd?: string, timeout = 10_000): string {
  try {
    const r = spawnSync(cmd, args, { cwd, encoding: "utf8", timeout, windowsHide: true });
    return r.status === 0 ? (r.stdout ?? "").trim() : "";
  } catch { return ""; }
}

export function has(cmd: string): boolean {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], { encoding: "utf8" });
  return r.status === 0;
}
