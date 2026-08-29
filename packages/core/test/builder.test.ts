import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../src/schema.js";
import { buildRow } from "../src/layout.js";
import { renderWeb } from "../src/adapters/web.js";
import { renderAnsi } from "../src/render.js";
import { gradientPhase } from "../src/adapters/ansi.js";
import type { RuntimeData } from "../src/runtime.js";

const cfg = parseConfig({
  version: 1,
  breakpoints: [{ id: "xs", minCols: 0 }],
  rows: [{ id: "r", tiles: [
    { id: "has", type: "model" },
    { id: "none", type: "session-name" },   // absent from the data below
  ]}],
});
const data: RuntimeData = { cc: { model: { display_name: "Opus 5" } }, local: {}, columns: 200 };

test("the terminal drops a tile with no data", () => {
  const built = buildRow(cfg, 0, data, 200);
  assert.deepEqual(built.map((t) => t.tile.id), ["has"], "an absent field must not draw a box");
});

test("the builder keeps it as a flagged placeholder", () => {
  const built = buildRow(cfg, 0, data, 200, { keepEmpty: true });
  assert.deepEqual(built.map((t) => t.tile.id), ["has", "none"]);
  assert.equal(built.find((t) => t.tile.id === "none")!.empty, true);
  assert.equal(built.find((t) => t.tile.id === "has")!.empty, false);
});

test("renderWeb marks placeholders and carries the row index", () => {
  const web = renderWeb(cfg, data);
  const tiles = web.rows[0]!.tiles;
  assert.equal(tiles.length, 2, "the canvas shows both, so both can be selected");
  assert.equal(tiles.find((t) => t.tileId === "none")!.empty, true);
  assert.equal(tiles[0]!.rowIndex, 0);
});

test("a placeholder never reaches the terminal output", () => {
  const line = renderAnsi(cfg, data).join("\n");
  assert.ok(line.includes("Opus 5"));
  assert.ok(!line.includes("Session name"), "the placeholder label must stay in the builder");
});

test("gradient phase ping-pongs rather than jumping at the seam", () => {
  const speed = 0.5;
  const at = (ms: number) => gradientPhase(speed, ms);
  assert.equal(at(0), 0);
  assert.ok(Math.abs(at(2000) - 1) < 1e-9, "half a cycle reaches the far end");
  assert.ok(Math.abs(at(4000) - 0) < 1e-9, "a full cycle returns");
  for (let ms = 0; ms < 8000; ms += 137) {
    const v = at(ms);
    assert.ok(v >= 0 && v <= 1, `phase out of range at ${ms}: ${v}`);
  }
});

test("an animated ground actually differs between two moments", () => {
  const flowing = parseConfig({
    version: 1,
    breakpoints: [{ id: "xs", minCols: 0 }],
    theme: { terminalGradient: { from: "#000000", to: "#ffffff", animated: true, speed: 0.5 } },
    rows: [{ id: "r", tiles: [{ id: "a", type: "model" }] }],
  });
  const at = (ms: number) =>
    renderAnsi(flowing, { ...data, local: { now: new Date(ms) } }).join("");
  assert.notEqual(at(0), at(1000), "the ground must move between renders");
});

test("a static ground is identical between renders", () => {
  const still = parseConfig({
    version: 1,
    breakpoints: [{ id: "xs", minCols: 0 }],
    theme: { terminalGradient: { from: "#000000", to: "#ffffff", animated: false, speed: 0.5 } },
    rows: [{ id: "r", tiles: [{ id: "a", type: "model" }] }],
  });
  const at = (ms: number) => renderAnsi(still, { ...data, local: { now: new Date(ms) } }).join("");
  assert.equal(at(0), at(9999), "a static gradient must not shimmer");
});
