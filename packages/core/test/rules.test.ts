import { test } from "node:test";
import assert from "node:assert/strict";
import { SIGNALS, signalActive, evaluateRules, blinkOn, EDGES, type Rule } from "../src/rules.js";
import { parseConfig } from "../src/schema.js";
import { renderAnsi } from "../src/render.js";
import type { RuntimeData } from "../src/runtime.js";

const base: RuntimeData = { cc: {}, local: {}, columns: 200 };

test("every signal is evaluable and none throws on empty data", () => {
  for (const s of SIGNALS) {
    assert.doesNotThrow(() => signalActive(s.id, s.threshold?.def, base), s.id);
  }
});

test("only 'always' fires with no data at all", () => {
  const firing = SIGNALS.filter((s) => signalActive(s.id, s.threshold?.def, base)).map((s) => s.id);
  assert.deepEqual(firing, ["always"], `unexpected: ${firing.join(", ")}`);
});

test("CI signals read the conclusion", () => {
  const d = (c: string | null, st = "completed"): RuntimeData =>
    ({ ...base, ci: { available: true, status: st, conclusion: c } });
  assert.ok(signalActive("ci.failing", undefined, d("failure")));
  assert.ok(signalActive("ci.failing", undefined, d("timed_out")));
  assert.ok(!signalActive("ci.failing", undefined, d("success")));
  assert.ok(signalActive("ci.passing", undefined, d("success")));
  assert.ok(signalActive("ci.running", undefined, d(null, "in_progress")));
});

test("a null context percentage is not a trigger", () => {
  const d: RuntimeData = { ...base, cc: { context_window: { used_percentage: null } } };
  assert.ok(!signalActive("context.above", 1, d), "null must not fire a threshold rule");
  const live: RuntimeData = { ...base, cc: { context_window: { used_percentage: 85 } } };
  assert.ok(signalActive("context.above", 80, live));
  assert.ok(!signalActive("context.above", 90, live));
});

test("battery only fires while unplugged", () => {
  const on: RuntimeData = { ...base, system: { battery: { percent: 10, charging: true } } };
  const off: RuntimeData = { ...base, system: { battery: { percent: 10, charging: false } } };
  assert.ok(!signalActive("battery.below", 20, on), "charging is not a low-battery state");
  assert.ok(signalActive("battery.below", 20, off));
});

test("git.clean needs a branch and nothing pending", () => {
  assert.ok(!signalActive("git.clean", undefined, base), "no repo is not 'clean'");
  assert.ok(signalActive("git.clean", undefined,
    { ...base, git: { branch: "main", staged: 0, modified: 0, untracked: 0, conflict: 0 } }));
  assert.ok(!signalActive("git.clean", undefined,
    { ...base, git: { branch: "main", staged: 0, modified: 2, untracked: 0, conflict: 0 } }));
});

test("blink alternates and is bounded", () => {
  assert.equal(blinkOn(0.5, 0), true);
  assert.equal(blinkOn(0.5, 1100), false);
  assert.equal(blinkOn(0.5, 2100), true);
  // a nonsense rate must not divide by zero
  assert.doesNotThrow(() => blinkOn(0, 500));
});

test("later rules win, and only firing ones apply", () => {
  const rules: Rule[] = [
    { signal: "always", fg: "#111111" },
    { signal: "ci.passing", fg: "#00ff00" },
    { signal: "ci.failing", fg: "#ff0000" },
  ];
  const passing = evaluateRules(rules, { ...base, ci: { available: true, conclusion: "success" } }, 0);
  assert.equal(passing.fg, "#00ff00");
  assert.deepEqual(passing.fired, ["always", "ci.passing"]);
  const failing = evaluateRules(rules, { ...base, ci: { available: true, conclusion: "failure" } }, 0);
  assert.equal(failing.fg, "#ff0000");
});

test("a blink colour only lands during its on phase", () => {
  const rules: Rule[] = [{ signal: "always", blink: { target: "border", color: "#ff0000", hz: 0.5 } }];
  assert.equal(evaluateRules(rules, base, 0).blinkColor, "#ff0000");
  assert.equal(evaluateRules(rules, base, 1100).blinkColor, undefined, "off phase must clear it");
  assert.equal(evaluateRules(rules, base, 1100).blinkTarget, "border", "target stays known");
});

test("edge characters are two columns and are measured by the solver", () => {
  const mk = (edge: string) => parseConfig({
    version: 2, breakpoints: [{ id: "xs", minCols: 0 }],
    rows: [{ id: "r", tiles: [{ id: "a", type: "model",
      style: { border: { edge, line: "none", color: "#ffffff" } } }] }],
  });
  const data: RuntimeData = { ...base, cc: { model: { display_name: "Opus 5" } } };
  const plain = renderAnsi(mk("none"), data).join("");
  const edged = renderAnsi(mk("bracket"), data).join("");
  assert.ok(edged.includes("[") && edged.includes("]"), "edge glyphs must be emitted");
  assert.ok(edged.length > plain.length);
  assert.deepEqual(EDGES.bracket, ["[", "]"]);
});

test("a firing rule changes the emitted line; a non-firing one does not", () => {
  const cfg = parseConfig({
    version: 2, breakpoints: [{ id: "xs", minCols: 0 }],
    rows: [{ id: "r", tiles: [{ id: "a", type: "model", style: {
      bg: "#1f2430", fg: "#ffffff",
      rules: [{ signal: "ci.failing", border: { edge: "block", line: "both", color: "#ff5f5f" },
                blink: { target: "border", color: "#ff0000", hz: 0.5 } }],
    } }] }],
  });
  const data = (c: string | null, ms: number): RuntimeData => ({
    ...base, cc: { model: { display_name: "Opus 5" } },
    local: { now: new Date(ms) }, ci: { available: true, conclusion: c },
  });
  const quiet = renderAnsi(cfg, data("success", 0)).join("");
  const alarmOn = renderAnsi(cfg, data("failure", 0)).join("");
  const alarmOff = renderAnsi(cfg, data("failure", 1100)).join("");
  assert.ok(!quiet.includes("▌"), "a passing build must not draw the alarm edge");
  assert.ok(alarmOn.includes("▌"), "a failing build must draw it");
  assert.notEqual(alarmOn, alarmOff, "the blink must alternate between redraws");
});
