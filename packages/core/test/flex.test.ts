import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig, RowSchema } from "../src/schema.js";
import { renderAnsi } from "../src/render.js";
import { renderWeb } from "../src/adapters/web.js";
import { fitRow } from "../src/layout.js";
import { displayWidth } from "../src/width.js";
import type { RuntimeData } from "../src/runtime.js";

const data: RuntimeData = {
  cc: { model: { display_name: "Opus 5" }, session_name: "war-room" },
  local: {}, columns: 60,
};

const cfg = (flexOn: boolean) => parseConfig({
  version: 2, breakpoints: [{ id: "xs", minCols: 0 }],
  rows: [{ id: "r", tiles: [
    { id: "a", type: "model" },
    { id: "s", type: "separator", flex: flexOn },
    { id: "b", type: "session-name" },
  ]}],
});

test("a row with no flex tile reports no slack", () => {
  const r = fitRow(
    [{ tile: { id: "a" } as any, spans: [], width: 10, priority: 1, flex: false,
       style: {} as any, effect: { fired: [] } }],
    60, 1, 1);
  assert.equal(r.slack, 0);
});

test("slack is the spare width, and only when something can absorb it", () => {
  const mk = (flex: boolean) => ([{ tile: { id: "a" } as any, spans: [], width: 10,
    priority: 1, flex, style: {} as any, effect: { fired: [] } }]);
  assert.equal(fitRow(mk(false), 60, 1, 1).slack, 0, "no flex tile means no slack");
  assert.equal(fitRow(mk(true), 60, 1, 1).slack, 48, "60 - (10 + 2 pad)");
});

test("an unknown width never produces slack", () => {
  const t = [{ tile: { id: "a" } as any, spans: [], width: 10, priority: 1, flex: true,
               style: {} as any, effect: { fired: [] } }];
  assert.equal(fitRow(t, 0, 1, 1).slack, 0, "cols<=0 means unknown, so do not pad");
});

test("the flex tile pads the terminal line out to the full width", () => {
  const plain = renderAnsi(cfg(false), data).join("");
  const flexed = renderAnsi(cfg(true), data).join("");
  assert.ok(displayWidth(flexed) > displayWidth(plain), "flex must widen the row");
  assert.equal(displayWidth(flexed), 60, "and fill exactly the available columns");
});

test("right-alignment holds at several widths", () => {
  for (const cols of [40, 60, 100, 180]) {
    const line = renderAnsi(cfg(true), { ...data, columns: cols }).join("");
    assert.equal(displayWidth(line), cols, `width ${cols} did not fill`);
  }
});

test("the preview carries the same slack the terminal used", () => {
  const web = renderWeb(cfg(true), data);
  assert.equal(web.rows[0]!.slack, 60 - web.rows[0]!.width);
  assert.equal(web.rows[0]!.tiles.find((t) => t.tileId === "s")!.flex, true);
});

test("two flex tiles in one row are rejected, with a reason", () => {
  const bad = RowSchema.safeParse({ id: "r", tiles: [
    { id: "a", type: "separator", flex: true },
    { id: "b", type: "separator", flex: true },
  ]});
  assert.equal(bad.success, false);
  if (!bad.success) assert.match(bad.error.issues[0]!.message, /at most one tile flex/);
  assert.ok(RowSchema.safeParse({ id: "r", tiles: [
    { id: "a", type: "separator", flex: true }] }).success);
});
