/**
 * Perf gate. The budget exists because Claude Code debounces at 300ms and
 * kills an in-flight run rather than queuing it, so a slow renderer silently
 * drops updates.
 *
 * The measurement subtracts Node's own startup, calibrated on the machine
 * doing the measuring. Without that subtraction the gate is really a hardware
 * benchmark: a shared CI runner boots Node in roughly twice the time a laptop
 * does, so an absolute wall-clock budget calibrated locally fails in CI while
 * the renderer itself is unchanged. That is exactly what happened on the first
 * public CI run — 106.5ms against a 100ms budget, with every test passing.
 *
 * So there are two numbers:
 *   total   — what a user's shell actually waits for. Reported, not gated,
 *             because it is dominated by hardware.
 *   render  — total minus the startup floor. This is the code's own cost,
 *             it is portable across machines, and it is what gates the build.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RENDER_BUDGET_MS = Number(process.env.STATUSLINE_RENDER_BUDGET ?? 75);
const RUNS = 12;
const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, "statusline.js");   // the shipped bundle, not the raw entry

const payload = JSON.stringify({
  session_id: "bench",
  model: { display_name: "Opus 5" },
  effort: { level: "xhigh" },
  context_window: { total_input_tokens: 226000, context_window_size: 1000000, used_percentage: 23 },
  rate_limits: { five_hour: { used_percentage: 39, resets_at: Date.now() / 1000 + 2520 } },
});

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const timed = (fn: () => void) => {
  const t = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - t) / 1e6;
};

/* calibrate: what does this machine charge just to start node? */
const floors: number[] = [];
for (let i = 0; i < RUNS; i++) floors.push(timed(() => spawnSync(process.execPath, ["-e", ""])));
const floor = median(floors);

spawnSync(process.execPath, [cli, "render"], { input: payload, env: { ...process.env, COLUMNS: "200" } });

const times: number[] = [];
for (let i = 0; i < RUNS; i++) {
  let status: number | null = 0;
  const ms = timed(() => {
    const r = spawnSync(process.execPath, [cli, "render"], {
      input: payload, env: { ...process.env, COLUMNS: "200" },
    });
    status = r.status;
  });
  if (status !== 0) { console.error(`run ${i} exited ${status}`); process.exit(1); }
  times.push(ms);
}
times.sort((a, b) => a - b);
const total = median(times);
const p95 = times[Math.floor(times.length * 0.95)]!;
const render = Math.max(0, total - floor);

for (let i = 0; i < Math.min(5, times.length); i++) console.log(`  run ${i + 1}: ${times[i]!.toFixed(1)} ms`);
console.log(`  ---`);
console.log(`  node startup floor  ${floor.toFixed(1)} ms   (this machine)`);
console.log(`  total               ${total.toFixed(1)} ms   median | p95 ${p95.toFixed(1)} ms`);
console.log(`  render cost         ${render.toFixed(1)} ms   total - floor`);
console.log(`  budget              ${RENDER_BUDGET_MS} ms on render cost -> ${render < RENDER_BUDGET_MS ? "PASS" : "FAIL"}`);
if (render >= RENDER_BUDGET_MS) {
  console.error(`REGRESSION: render cost ${render.toFixed(1)}ms >= ${RENDER_BUDGET_MS}ms`);
  process.exit(1);
}
