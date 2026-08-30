/**
 * Exercises the Linux metric readers against real /proc data.
 *
 * These cannot be verified on macOS, so they run in a container:
 *   docker run --rm -v "$PWD":/repo:ro -w /repo node:22-alpine \
 *     node scripts/verify-linux-metrics.mjs
 *
 * Exits non-zero on a failed assertion so CI can gate on it.
 */
import { sample } from "../packages/cli/dist/metrics.js";
import assert from "node:assert/strict";
const a = sample("/");
await new Promise((r) => setTimeout(r, 1200));
// burn a little CPU so the delta is non-zero and provable
const end = Date.now() + 400; while (Date.now() < end) Math.sqrt(Math.random());
const b = sample("/");
const out = {
  platform: process.platform,
  first_cpu_undefined: a.cpuPct === undefined,
  cpuPct: b.cpuPct,
  memUsed: b.memUsed, memTotal: b.memTotal,
  swapTotal: b.swapTotal,
  diskPct: b.diskPct,
  load1: b.load1,
  netRx: b.netRx, netTx: b.netTx,
  gpu_omitted: b.gpuPct === undefined,
};
console.log(JSON.stringify(out, null, 1));

assert.equal(out.platform, "linux", "this must run on Linux to mean anything");
assert.equal(out.first_cpu_undefined, true, "the first sample has no previous, so no CPU delta");
assert.ok(out.cpuPct > 0 && out.cpuPct <= 100, `cpuPct out of range: ${out.cpuPct}`);
assert.ok(out.memTotal > 0 && out.memUsed > 0 && out.memUsed < out.memTotal, "memory from /proc/meminfo");
assert.ok(out.diskPct >= 0 && out.diskPct <= 100, "disk from statfs");
assert.ok(out.load1 >= 0, "load average");
assert.ok(out.netRx !== undefined && out.netRx >= 0, "rx delta from /proc/net/dev");
assert.ok(out.netTx !== undefined && out.netTx >= 0, "tx delta from /proc/net/dev");
assert.equal(out.gpu_omitted, true, "no nvidia-smi in the container, so GPU must be absent not zero");
console.log("\nall Linux reader assertions passed");
