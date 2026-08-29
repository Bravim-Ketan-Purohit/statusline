import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../src/schema.js";
import { renderAnsi } from "../src/render.js";
import { renderWeb } from "../src/adapters/web.js";
import { isSuppressed } from "../src/rules.js";
import type { RuntimeData } from "../src/runtime.js";

const ci = (conclusion: string | null): RuntimeData =>
  ({ cc: {}, local: {}, columns: 120, ci: { available: true, status: "completed", conclusion } });
const mk = (style: Record<string, unknown>) => parseConfig({
  version: 2, breakpoints: [{ id: "xs", minCols: 0 }],
  rows: [{ id: "r", tiles: [{ id: "ci", type: "ci", style: { label: "ci", ...style } }] }],
});
const out = (cfg: ReturnType<typeof mk>, d: RuntimeData) => renderAnsi(cfg, d).join("");

test("no visibility rule means always visible", () => {
  assert.equal(isSuppressed(undefined, undefined, undefined, ci("success")), false);
});

test("showOnlyWhen hides the tile until its signal holds", () => {
  const cfg = mk({ showOnlyWhen: [{ signal: "ci.failing" }] });
  assert.equal(out(cfg, ci("success")), "", "a green build shows nothing");
  assert.ok(out(cfg, ci("failure")).includes("failing"), "a red build shows it");
});

test("hideWhen is the inverse", () => {
  const cfg = mk({ hideWhen: [{ signal: "ci.passing" }] });
  assert.equal(out(cfg, ci("success")), "");
  assert.ok(out(cfg, ci("failure")).includes("failing"));
});

test("showOnlyWhen wins when both are set", () => {
  // Both point the same way here; the point is that only one is consulted.
  assert.equal(isSuppressed(
    [{ signal: "always" }], [{ signal: "ci.failing" }], undefined, ci("failure")), false);
});

test("an escalating rule overrides any suppression", () => {
  const cfg = mk({
    hideWhen: [{ signal: "always" }],
    rules: [{ signal: "ci.failing", escalate: true,
              border: { edge: "block", line: "both", color: "#ff0000" } }],
  });
  assert.equal(out(cfg, ci("success")), "", "still hidden while calm");
  assert.ok(out(cfg, ci("failure")).includes("▌"), "an incident must never be filtered away");
});

test("a non-escalating rule does not defeat suppression", () => {
  const cfg = mk({
    hideWhen: [{ signal: "always" }],
    rules: [{ signal: "ci.failing", border: { edge: "block", line: "none", color: "#ff0000" } }],
  });
  assert.equal(out(cfg, ci("failure")), "", "styling is not a reason to appear");
});

test("a threshold signal suppresses correctly on both sides", () => {
  const cfg = mk({ showOnlyWhen: [{ signal: "context.above", threshold: 80 }] });
  const at = (p: number) => renderAnsi(cfg, {
    cc: { context_window: { used_percentage: p } }, local: {}, columns: 120,
    ci: { available: true, conclusion: "success" },
  }).join("");
  assert.equal(at(50), "");
  assert.ok(at(85).length > 0);
});

test("the builder keeps a suppressed tile so it stays editable", () => {
  const cfg = mk({ showOnlyWhen: [{ signal: "ci.failing" }] });
  const web = renderWeb(cfg, ci("success"));
  assert.equal(web.rows[0]!.tiles.length, 1, "it must not vanish from the canvas");
  assert.equal(web.rows[0]!.tiles[0]!.suppressed, true, "but it must be flagged");
  assert.equal(renderAnsi(cfg, ci("success")).join(""), "", "while the terminal drops it");
});
