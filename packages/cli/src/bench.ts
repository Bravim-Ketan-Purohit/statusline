/**
 * Perf gate. The spec's budget is a 100ms warm render; Claude Code debounces
 * at 300ms and kills an in-flight run rather than queuing it, so a slow
 * renderer silently drops updates. Exits non-zero on regression so CI fails.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BUDGET_MS = 100;
const RUNS = 12;
const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "index.js");

const payload = JSON.stringify({
  session_id: "bench",
  model: { display_name: "Opus 5" },
  effort: { level: "xhigh" },
  context_window: { total_input_tokens: 226000, context_window_size: 1000000, used_percentage: 23 },
  rate_limits: { five_hour: { used_percentage: 39, resets_at: Date.now() / 1000 + 2520 } },
});

spawnSync(process.execPath, [cli, "render"], { input: payload, env: { ...process.env, COLUMNS: "200" } });

const times: number[] = [];
for (let i = 0; i < RUNS; i++) {
  const t = process.hrtime.bigint();
  const r = spawnSync(process.execPath, [cli, "render"], {
    input: payload, env: { ...process.env, COLUMNS: "200" },
  });
  const ms = Number(process.hrtime.bigint() - t) / 1e6;
  if (r.status !== 0) { console.error(`run ${i} exited ${r.status}`); process.exit(1); }
  times.push(ms);
}
times.sort((a, b) => a - b);
const median = times[Math.floor(times.length / 2)]!;
const p95 = times[Math.floor(times.length * 0.95)]!;
const max = times[times.length - 1]!;

for (let i = 0; i < Math.min(5, times.length); i++) console.log(`  run ${i + 1}: ${times[i]!.toFixed(1)} ms`);
console.log(`  ---`);
console.log(`  median ${median.toFixed(1)} ms | p95 ${p95.toFixed(1)} ms | max ${max.toFixed(1)} ms`);
console.log(`  budget ${BUDGET_MS} ms -> ${median < BUDGET_MS ? "PASS" : "FAIL"}`);
if (median >= BUDGET_MS) { console.error(`REGRESSION: median ${median.toFixed(1)}ms >= ${BUDGET_MS}ms`); process.exit(1); }
