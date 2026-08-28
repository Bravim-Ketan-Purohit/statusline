import { test } from "node:test";
import assert from "node:assert/strict";
import { fitRow, resolveBreakpoint, effectiveOverride } from "../src/layout.js";
import type { ResolvedTile } from "../src/layout.js";
import type { Breakpoint, Tile } from "../src/schema.js";

const t = (id: string, width: number, priority: number): ResolvedTile =>
  ({ tile: { id } as Tile, spans: [], width, priority, flex: false, style: {} as any });

const BPS: Breakpoint[] = [
  { id: "xs", minCols: 0 }, { id: "sm", minCols: 40 },
  { id: "md", minCols: 80 }, { id: "lg", minCols: 120 },
];

test("resolveBreakpoint picks the largest minCols <= cols", () => {
  assert.equal(resolveBreakpoint(BPS, 0).id, "xs");
  assert.equal(resolveBreakpoint(BPS, 39).id, "xs");
  assert.equal(resolveBreakpoint(BPS, 40).id, "sm");
  assert.equal(resolveBreakpoint(BPS, 119).id, "md");
  assert.equal(resolveBreakpoint(BPS, 5000).id, "lg");
});

test("fitRow drops the highest priority NUMBER first", () => {
  const tiles = [t("keep", 10, 1), t("drop", 10, 9), t("mid", 10, 5)];
  const r = fitRow(tiles, 30, 1, 1);
  assert.deepEqual(r.kept.map((x) => x.tile.id), ["keep", "mid"]);
  assert.deepEqual(r.dropped.map((x) => x.tile.id), ["drop"]);
});

test("fitRow keeps dropping until it fits", () => {
  const tiles = [t("a", 20, 1), t("b", 20, 2), t("c", 20, 3)];
  assert.equal(fitRow(tiles, 24, 1, 1).kept.length, 1);
});

test("cols<=0 means unknown width and drops nothing", () => {
  const tiles = [t("a", 500, 1), t("b", 500, 9)];
  assert.equal(fitRow(tiles, 0, 1, 1).kept.length, 2);
});

test("ties resolve deterministically", () => {
  const tiles = [t("a", 10, 5), t("b", 10, 5), t("c", 10, 5)];
  const once = fitRow(tiles, 26, 1, 1).kept.map((x) => x.tile.id);
  const twice = fitRow(tiles, 26, 1, 1).kept.map((x) => x.tile.id);
  assert.deepEqual(once, twice);
});

test("sparse overrides inherit from smaller breakpoints", () => {
  const tile = {
    id: "x",
    responsive: { priority: 3, xs: { hidden: true }, md: { hidden: false, compact: true } },
  } as unknown as Tile;
  assert.equal(effectiveOverride(tile, BPS, "xs").hidden, true);
  assert.equal(effectiveOverride(tile, BPS, "sm").hidden, true, "sm inherits xs");
  assert.equal(effectiveOverride(tile, BPS, "md").hidden, false, "md overrides");
  assert.equal(effectiveOverride(tile, BPS, "lg").compact, true, "lg inherits md");
});
