import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../src/schema.js";
import { renderAnsi } from "../src/render.js";
import { renderWeb } from "../src/adapters/web.js";
import { canDo, TARGETS, type Feature } from "../src/capabilities.js";
import { evaluateRules } from "../src/rules.js";
import type { RuntimeData } from "../src/runtime.js";

const cfg = parseConfig({ version: 2, breakpoints: [{ id: "xs", minCols: 0 }] });

test("every target answers every feature without throwing", () => {
  const feats: Feature[] = ["click", "osc8Link", "overline", "underlineColor",
    "truecolor", "nerdFontGlyph", "imageFill", "animatedFill", "drill", "multiRow"];
  for (const t of TARGETS) for (const f of feats) {
    const v = canDo(t.id, f, cfg);
    assert.equal(typeof v.ok, "boolean", `${t.id}/${f}`);
    if (!v.ok) assert.ok(v.reason, `${t.id}/${f} must explain why not`);
  }
});

test("the matrix reflects the real asymmetry between targets", () => {
  assert.equal(canDo("tmux", "click", cfg).ok, true, "tmux dispatches commands");
  assert.equal(canDo("claudeCode", "click", cfg).ok, false, "Claude Code captures stdout");
  assert.equal(canDo("tmux", "osc8Link", cfg).ok, false, "tmux drops OSC 8");
  assert.equal(canDo("claudeCode", "osc8Link", cfg).ok, true);
  assert.equal(canDo("tmux", "multiRow", cfg).ok, false, "tmux status is one line");
  assert.equal(canDo("tmux", "drill", cfg).ok, true, "only tmux can popup");
  assert.equal(canDo("claudeCode", "drill", cfg).ok, false);
});

test("enabling the daemon changes what a Claude Code click can do", () => {
  const withDaemon = parseConfig({
    version: 2, breakpoints: [{ id: "xs", minCols: 0 }], daemon: { enabled: true, port: 7717 },
  });
  assert.equal(canDo("claudeCode", "click", cfg).ok, false);
  assert.equal(canDo("claudeCode", "click", withDaemon).ok, true);
  assert.match(canDo("claudeCode", "click", withDaemon).reason!, /OSC 8/);
});

test("a caveat is reported even when the answer is yes", () => {
  const v = canDo("claudeCode", "animatedFill", cfg);
  assert.equal(v.ok, true);
  assert.match(v.reason!, /1 second/, "the redraw floor must be stated, not implied");
});

// --- rotation ---------------------------------------------------------------

const rot = parseConfig({
  version: 2, breakpoints: [{ id: "xs", minCols: 0 }],
  rows: [{ id: "r", rotation: [{ tiles: ["a", "b", "c"], every: "minute" }], tiles: [
    { id: "a", type: "text", props: { text: "ALPHA" } },
    { id: "b", type: "text", props: { text: "BRAVO" } },
    { id: "c", type: "text", props: { text: "CHARLIE" } },
    { id: "z", type: "text", props: { text: "ALWAYS" } },
  ]}],
});
const at = (ms: number) =>
  renderAnsi(rot, { cc: {}, local: { now: new Date(ms) }, columns: 200 })
    .join("").replace(/\x1b\[[0-9;]*m/g, "");

test("a rotation slot shows exactly one of its tiles", () => {
  const line = at(0);
  const shown = ["ALPHA", "BRAVO", "CHARLIE"].filter((n) => line.includes(n));
  assert.equal(shown.length, 1, `expected one, got ${shown.join(",")}`);
  assert.ok(line.includes("ALWAYS"), "a tile outside the slot is unaffected");
});

test("rotation is stable within a bucket and advances across them", () => {
  const M = 60_000;
  assert.equal(at(5 * M), at(5 * M + 30_000), "the same minute must not re-roll");
  const seen = new Set([0, 1, 2, 3, 4, 5].map((m) => at(m * M)));
  assert.ok(seen.size > 1, "it must actually advance");
});

test("the builder keeps rotated-out tiles so they stay editable", () => {
  const web = renderWeb(rot, { cc: {}, local: { now: new Date(0) }, columns: 200 });
  assert.equal(web.rows[0]!.tiles.length, 4, "all four stay on the canvas");
  assert.equal(web.rows[0]!.tiles.filter((t) => t.suppressed).length, 2,
    "two of the three rotating tiles are suppressed this tick");
});

// --- bell -------------------------------------------------------------------

test("a bell rule reports itself for the host to debounce", () => {
  const d: RuntimeData = { cc: { context_window: { used_percentage: 90 } }, local: {}, columns: 80 };
  const eff = evaluateRules(
    [{ signal: "context.above", threshold: 80, bell: true }], d, 0);
  assert.deepEqual(eff.bellFor, ["context.above"]);
  const quiet = evaluateRules(
    [{ signal: "context.above", threshold: 80, bell: true }],
    { ...d, cc: { context_window: { used_percentage: 10 } } }, 0);
  assert.equal(quiet.bellFor, undefined, "a rule that is not firing wants no bell");
});
