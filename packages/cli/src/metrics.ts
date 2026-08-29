import { readFileSync, statfsSync, existsSync } from "node:fs";
import { loadavg, totalmem, freemem } from "node:os";
import { run, has, CACHE_DIR, cacheRead, cacheWrite } from "./cache.js";

/**
 * Sampled OS metrics.
 *
 * DECISION (TODO 2.0.1): the daemon samples on a fixed interval and writes a
 * file the renderer reads. The alternative — diffing a previous sample inside
 * the renderer — makes the interval "however often the bar happened to
 * redraw", which is irregular and makes a CPU percentage meaningless.
 *
 * /proc/stat and the network counters are cumulative since boot, so a single
 * read tells you nothing. Everything here that needs a delta keeps the
 * previous sample in the sampler's memory.
 */

export interface Metrics {
  cpuPct?: number;
  memUsed?: number; memTotal?: number;
  swapUsed?: number; swapTotal?: number;
  diskPct?: number;
  load1?: number;
  netRx?: number; netTx?: number;       // bytes per second
  gpuPct?: number; vramUsed?: number; vramTotal?: number;
  at: number;
}

/** How old a metrics file may be before the renderer treats it as absent. */
export const METRICS_STALE_MS = 30_000;
const METRICS_KEY = "metrics";

interface RawSample {
  cpuBusy?: number; cpuTotal?: number;
  rx?: number; tx?: number;
  at: number;
}

const num = (s: string | undefined) => { const n = Number(s); return Number.isFinite(n) ? n : undefined; };

// --- Linux -----------------------------------------------------------------

function linuxCpuRaw(): { busy: number; total: number } | null {
  try {
    const line = readFileSync("/proc/stat", "utf8").split("\n")[0] ?? "";
    const f = line.trim().split(/\s+/).slice(1).map(Number);
    if (f.length < 4) return null;
    const total = f.reduce((a, b) => a + b, 0);
    const idle = (f[3] ?? 0) + (f[4] ?? 0);           // idle + iowait
    return { busy: total - idle, total };
  } catch { return null; }
}

function linuxMem(): Partial<Metrics> {
  try {
    const t: Record<string, number> = {};
    for (const line of readFileSync("/proc/meminfo", "utf8").split("\n")) {
      const m = /^(\w+):\s+(\d+) kB$/.exec(line);
      if (m) t[m[1]!] = Number(m[2]) * 1024;
    }
    const memTotal = t.MemTotal, avail = t.MemAvailable ?? t.MemFree;
    const swapTotal = t.SwapTotal ?? 0, swapFree = t.SwapFree ?? 0;
    return {
      memTotal, memUsed: memTotal !== undefined && avail !== undefined ? memTotal - avail : undefined,
      swapTotal, swapUsed: swapTotal - swapFree,
    };
  } catch { return {}; }
}

function linuxNetRaw(): { rx: number; tx: number } | null {
  try {
    let rx = 0, tx = 0;
    for (const line of readFileSync("/proc/net/dev", "utf8").split("\n").slice(2)) {
      const [name, rest] = line.split(":");
      if (!rest || !name || name.trim() === "lo") continue;   // loopback is noise
      const f = rest.trim().split(/\s+/).map(Number);
      rx += f[0] ?? 0; tx += f[8] ?? 0;
    }
    return { rx, tx };
  } catch { return null; }
}

// --- macOS -----------------------------------------------------------------

function macCpu(): number | undefined {
  // `top -l 1` is the cheapest unprivileged read; it already reports a
  // percentage, so no delta is needed. Coarser than /proc/stat by design.
  const out = run("top", ["-l", "1", "-n", "0", "-stats", "cpu"], undefined, 4000);
  const m = /CPU usage:\s*([\d.]+)% user,\s*([\d.]+)% sys/.exec(out);
  if (!m) return undefined;
  return Math.min(100, (num(m[1]) ?? 0) + (num(m[2]) ?? 0));
}

function macMem(): Partial<Metrics> {
  const memTotal = totalmem();
  const out = run("vm_stat", [], undefined, 3000);
  const page = num(/page size of (\d+)/.exec(out)?.[1]) ?? 4096;
  const get = (k: string) => num(new RegExp(k + ":\\s+(\\d+)").exec(out)?.[1]) ?? 0;
  // "Available" on macOS is free + inactive + speculative; everything else is
  // in use as far as a status line is concerned.
  const free = (get("Pages free") + get("Pages inactive") + get("Pages speculative")) * page;
  const swapOut = run("sysctl", ["-n", "vm.swapusage"], undefined, 3000);
  const sm = /total = ([\d.]+)M.*used = ([\d.]+)M/.exec(swapOut);
  return {
    memTotal, memUsed: Math.max(0, memTotal - free),
    swapTotal: sm ? Number(sm[1]) * 1024 * 1024 : 0,
    swapUsed: sm ? Number(sm[2]) * 1024 * 1024 : 0,
  };
}

function macNetRaw(): { rx: number; tx: number } | null {
  // -n is not optional: without it netstat resolves hostnames and can block
  // for seconds, which would stall the whole sample loop.
  const out = run("netstat", ["-ibn"], undefined, 4000);
  if (!out) return null;
  let rx = 0, tx = 0, matched = 0;
  const seen = new Set<string>();
  for (const line of out.split("\n").slice(1)) {
    const f = line.trim().split(/\s+/);
    const name = f[0];
    if (!name || name === "lo0" || seen.has(name)) continue;
    // netstat -ib repeats each interface once per address family, and the
    // Address column is EMPTY on the <Link#N> rows -- so the column count
    // varies by row and fixed indices read the wrong numbers. The <Link#N>
    // row is the per-interface aggregate and always has the same shape:
    //   Name Mtu <Link#N> Ipkts Ierrs Ibytes Opkts Oerrs Obytes ...
    if (!f[2]?.startsWith("<Link")) continue;
    // Even the <Link#N> rows vary: a physical interface prints its MAC in the
    // Address column and a virtual one leaves it blank, so the row is 10 or 11
    // fields. Reading by numeric position instead of index sidesteps that --
    // a MAC contains colons, so it is not a number and drops out on its own.
    const nums = f.slice(3).filter((x) => /^\d+$/.test(x)).map(Number);
    if (nums.length < 6) continue;
    // Ipkts Ierrs Ibytes Opkts Oerrs Obytes
    seen.add(name); rx += nums[2]!; tx += nums[5]!; matched++;
  }
  return matched ? { rx, tx } : null;
}

// --- shared ----------------------------------------------------------------

function diskPct(path: string): number | undefined {
  try {
    const s = statfsSync(path);
    const total = Number(s.blocks) * Number(s.bsize);
    const free = Number(s.bavail) * Number(s.bsize);
    if (!total) return undefined;
    return Math.round(((total - free) / total) * 100);
  } catch { return undefined; }
}

function gpu(): Partial<Metrics> {
  // macOS has no unprivileged GPU utilisation API — powermetrics needs sudo.
  // Detect and omit rather than shipping a broken tile.
  if (process.platform === "darwin" || !has("nvidia-smi")) return {};
  const out = run("nvidia-smi",
    ["--query-gpu=utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"],
    undefined, 3000);
  const f = out.split("\n")[0]?.split(",").map((x) => num(x.trim()));
  if (!f || f[0] === undefined) return {};
  return { gpuPct: f[0], vramUsed: (f[1] ?? 0) * 1024 * 1024, vramTotal: (f[2] ?? 0) * 1024 * 1024 };
}

let prev: RawSample | null = null;

/** One sample. Deltas come from `prev`, which the caller keeps between ticks. */
export function sample(diskPath = process.cwd()): Metrics {
  const now = Date.now();
  const linux = process.platform === "linux";
  const out: Metrics = { at: now, load1: loadavg()[0], diskPct: diskPct(diskPath), ...gpu() };

  Object.assign(out, linux ? linuxMem() : process.platform === "darwin" ? macMem() : {
    memTotal: totalmem(), memUsed: totalmem() - freemem(),
  });

  const raw: RawSample = { at: now };
  if (linux) {
    const c = linuxCpuRaw();
    if (c) { raw.cpuBusy = c.busy; raw.cpuTotal = c.total; }
    const n = linuxNetRaw();
    if (n) { raw.rx = n.rx; raw.tx = n.tx; }
  } else {
    out.cpuPct = macCpu();
    const n = macNetRaw();
    if (n) { raw.rx = n.rx; raw.tx = n.tx; }
  }

  if (prev) {
    const dt = (now - prev.at) / 1000;
    if (dt > 0.2) {
      if (linux && raw.cpuTotal !== undefined && prev.cpuTotal !== undefined) {
        const dTotal = raw.cpuTotal - prev.cpuTotal;
        const dBusy = (raw.cpuBusy ?? 0) - (prev.cpuBusy ?? 0);
        if (dTotal > 0) out.cpuPct = Math.max(0, Math.min(100, (dBusy / dTotal) * 100));
      }
      if (raw.rx !== undefined && prev.rx !== undefined) {
        out.netRx = Math.max(0, (raw.rx - prev.rx) / dt);
        out.netTx = Math.max(0, ((raw.tx ?? 0) - (prev.tx ?? 0)) / dt);
      }
    }
  }
  prev = raw;
  return out;
}

export function writeMetrics(m: Metrics) { cacheWrite(METRICS_KEY, CACHE_DIR, m); }

/** Renderer side: stale metrics are treated as absent, never shown as current. */
export function readMetrics(): Metrics | undefined {
  const hit = cacheRead<Metrics>(METRICS_KEY, CACHE_DIR);
  if (!hit || hit.ageMs > METRICS_STALE_MS) return undefined;
  return hit.data;
}

export function metricsAreStale(): boolean {
  const hit = cacheRead<Metrics>(METRICS_KEY, CACHE_DIR);
  return !hit || hit.ageMs > METRICS_STALE_MS;
}
