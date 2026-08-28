import { test } from "node:test";
import assert from "node:assert/strict";
import { registry, allTiles } from "../src/tiles/registry.js";
import type { RuntimeData } from "../src/runtime.js";

const empty: RuntimeData = { cc: {}, local: {}, columns: 200 };
/** Tiles that legitimately render with no stdin, because they read no field. */
const DATA_INDEPENDENT = new Set(["clock", "hostname", "spacer", "separator",
  "media-play", "media-next", "media-prev", "media-vol-up", "media-vol-down"]);

test("tile ids are unique and match their map key", () => {
  for (const [k, m] of registry) assert.equal(k, m.id);
  assert.equal(new Set(allTiles().map((t) => t.id)).size, allTiles().length);
});

test("every data-dependent tile renders nothing on empty data", () => {
  for (const m of allTiles()) {
    if (DATA_INDEPENDENT.has(m.id)) continue;
    assert.equal(m.render(m.defaultProps, empty, "full").length, 0, `${m.id} leaked an empty box`);
  }
});

test("every tile survives a compact render without throwing", () => {
  for (const m of allTiles()) {
    assert.doesNotThrow(() => m.render(m.defaultProps, empty, "compact"), m.id);
  }
});

test("every tile declares a category the builder groups by", () => {
  const ok = new Set(["session", "git", "environment", "personal", "media", "layout"]);
  for (const m of allTiles()) assert.ok(ok.has(m.category), `${m.id}: ${m.category}`);
});

test("verse selection is stable per session and varies across sessions", () => {
  const verses = [
    { src: "A 1.1", en: "one" }, { src: "B 2.2", en: "two" },
    { src: "C 3.3", en: "three" }, { src: "D 4.4", en: "four" },
  ];
  const mod = registry.get("verse")!;
  const pick = (sid: string) => {
    const d: RuntimeData = { cc: { session_id: sid }, local: {}, columns: 200, personal: { verses } };
    return mod.render(mod.defaultProps, d, "full").map((s) => s.text).join("");
  };
  assert.equal(pick("alpha"), pick("alpha"), "same session must not re-roll");
  assert.equal(pick("alpha"), pick("alpha"), "and again");
  const seen = new Set(["a", "b", "c", "d", "e", "f"].map(pick));
  assert.ok(seen.size > 1, "different sessions should not all collapse to one verse");
});

test("theme filter narrows the verse pool, and an empty result falls back", () => {
  const verses = [
    { src: "W 1", theme: "war", en: "w" },
    { src: "P 1", theme: "peace", en: "p" },
  ];
  const mod = registry.get("verse")!;
  const d: RuntimeData = { cc: { session_id: "x" }, local: {}, columns: 200, personal: { verses } };
  const warOnly = mod.render({ ...mod.defaultProps, themes: ["war"] }, d, "full").map((s) => s.text).join("");
  assert.ok(warOnly.includes("W 1"));
  const noMatch = mod.render({ ...mod.defaultProps, themes: ["nonexistent"] }, d, "full");
  assert.ok(noMatch.length > 0, "an empty filter result falls back to the full pool");
});

test("5h projection refuses a resets_at outside the window", () => {
  const mod = registry.get("five-hour-bar")!;
  const now = Date.now() / 1000;
  const d: RuntimeData = {
    cc: { rate_limits: { five_hour: { used_percentage: 39, resets_at: now + 9_999_999 } } },
    local: { now: new Date() }, columns: 200,
  };
  const text = mod.render(mod.defaultProps, d, "full").map((s) => s.text).join("");
  assert.ok(!/\d{4,}h/.test(text), `bogus countdown leaked: ${text}`);
  assert.ok(!text.includes("resets"), "an out-of-window reset must be omitted entirely");
});
