import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../src/schema.js";
import { renderAnsi } from "../src/render.js";
import { registry } from "../src/tiles/registry.js";
import { signalActive, SIGNALS } from "../src/rules.js";
import type { RuntimeData, Metrics } from "../src/runtime.js";

const METRIC_TILES = ["cpu", "memory", "swap", "disk", "load", "network", "gpu", "vram"];
const bare: RuntimeData = { cc: {}, local: {}, columns: 200 };
const withM = (m: Partial<Metrics>): RuntimeData => ({ ...bare, metrics: { at: Date.now(), ...m } });

test("every metric tile is silent without a sample", () => {
  for (const id of METRIC_TILES) {
    const mod = registry.get(id)!;
    assert.equal(mod.render(mod.defaultProps, bare, "full").length, 0, id);
  }
});

test("a metrics object present but missing that field is still silent", () => {
  // The daemon omits GPU on macOS entirely; that must read as absent, not zero.
  const mod = registry.get("gpu")!;
  assert.equal(mod.render(mod.defaultProps, withM({ cpuPct: 50 }), "full").length, 0);
});

test("zero is a real value and must render, unlike absent", () => {
  const mod = registry.get("cpu")!;
  const out = mod.render(mod.defaultProps, withM({ cpuPct: 0 }), "full").map((s) => s.text).join("");
  assert.match(out, /0%/, "an idle CPU is information");
});

test("swap hides at zero because unused swap is not news", () => {
  const mod = registry.get("swap")!;
  assert.equal(mod.render(mod.defaultProps, withM({ swapUsed: 0 }), "full").length, 0);
  assert.ok(mod.render(mod.defaultProps, withM({ swapUsed: 5e8 }), "full").length > 0);
});

test("memory needs both used and total", () => {
  const mod = registry.get("memory")!;
  assert.equal(mod.render(mod.defaultProps, withM({ memUsed: 1e9 }), "full").length, 0,
    "a used figure with no total cannot be shown as a proportion");
  assert.ok(mod.render(mod.defaultProps, withM({ memUsed: 1e9, memTotal: 4e9 }), "full").length > 0);
});

test("percentages stay column-stable from 0 to 100", () => {
  const mod = registry.get("cpu")!;
  const widths = [0, 7, 42, 100].map((v) =>
    mod.render({ width: 8, showBar: true }, withM({ cpuPct: v }), "full")
      .map((s) => s.text).join("").length);
  assert.equal(new Set(widths).size, 1, `expected stable width, got ${widths}`);
});

test("network shows a rate, and only after a delta exists", () => {
  const mod = registry.get("network")!;
  assert.equal(mod.render(mod.defaultProps, withM({ cpuPct: 1 }), "full").length, 0,
    "the first sample has no previous, so there is no rate yet");
  const out = mod.render(mod.defaultProps, withM({ netRx: 2048, netTx: 512 }), "full")
    .map((s) => s.text).join("");
  // One decimal below 10 keeps the figure column-stable as the rate moves.
  assert.match(out, /↓2\.0K/);
  assert.match(out, /↑512B/);
});

test("every metric signal exists, carries a threshold, and never fires when absent", () => {
  const ids = ["cpu.above", "mem.above", "swap.above", "disk.above",
               "load.above", "gpu.above", "vram.above"] as const;
  for (const id of ids) {
    const def = SIGNALS.find((s) => s.id === id);
    assert.ok(def, `${id} missing from SIGNALS`);
    assert.ok(def!.threshold, `${id} needs a threshold`);
    assert.equal(signalActive(id, def!.threshold!.def, bare), false,
      `${id} must not fire when the sampler is not running`);
  }
});

test("metric signals fire above and stay quiet below", () => {
  assert.equal(signalActive("cpu.above", 85, withM({ cpuPct: 90 })), true);
  assert.equal(signalActive("cpu.above", 85, withM({ cpuPct: 80 })), false);
  assert.equal(signalActive("mem.above", 50, withM({ memUsed: 6e9, memTotal: 8e9 })), true);
  assert.equal(signalActive("mem.above", 90, withM({ memUsed: 6e9, memTotal: 8e9 })), false);
  assert.equal(signalActive("swap.above", 256, withM({ swapUsed: 512 * 1024 * 1024 })), true);
  assert.equal(signalActive("swap.above", 1024, withM({ swapUsed: 512 * 1024 * 1024 })), false);
  assert.equal(signalActive("load.above", 4, withM({ load1: 6.2 })), true);
  assert.equal(signalActive("disk.above", 90, withM({ diskPct: 84 })), false);
});

test("a metric rule can drive a blinking border end to end", () => {
  const cfg = parseConfig({
    version: 2, breakpoints: [{ id: "xs", minCols: 0 }],
    rows: [{ id: "r", tiles: [{ id: "c", type: "cpu", style: {
      rules: [{ signal: "cpu.above", threshold: 85,
                border: { edge: "block", line: "both", color: "#ff5f5f" },
                blink: { target: "border", color: "#ff0000", hz: 0.5 } }],
    } }] }],
  });
  const at = (cpu: number, ms: number) =>
    renderAnsi(cfg, { ...bare, local: { now: new Date(ms) },
                      metrics: { at: Date.now(), cpuPct: cpu } }).join("");
  assert.ok(!at(20, 0).includes("▌"), "a quiet CPU must not draw the alarm edge");
  assert.ok(at(95, 0).includes("▌"), "a hot CPU must");
  assert.notEqual(at(95, 0), at(95, 1100), "and it must blink between redraws");
});
