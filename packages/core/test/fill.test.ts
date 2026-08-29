import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FILL_MODES, fillColorAt, sampleStops, sampleCells, fieldAt, pickPalette,
  DEFAULT_FILL, hsl2hex, type Fill,
} from "../src/fill.js";
import { parseConfig, CONFIG_VERSION } from "../src/schema.js";
import { renderAnsi } from "../src/render.js";

const g = (over: Partial<Fill> = {}): Fill => ({ ...DEFAULT_FILL, kind: "gradient", ...over });

test("stops interpolate and clamp at both ends", () => {
  const s = [{ color: "#000000", pos: 0 }, { color: "#ffffff", pos: 1 }];
  assert.equal(sampleStops(s, 0), "#000000");
  assert.equal(sampleStops(s, 1), "#ffffff");
  assert.equal(sampleStops(s, 0.5), "#808080");
  assert.equal(sampleStops(s, -5), "#000000", "below range clamps");
  assert.equal(sampleStops(s, 99), "#ffffff", "above range clamps");
});

test("a mid stop is honoured, and stop order does not matter", () => {
  const s = [{ color: "#ffffff", pos: 1 }, { color: "#ff0000", pos: 0.5 }, { color: "#000000", pos: 0 }];
  assert.equal(sampleStops(s, 0.5), "#ff0000");
});

test("every field stays inside 0..1 across the whole grid and clock", () => {
  for (const m of FILL_MODES) {
    const f = g({ mode: m.id, scale: 3, animated: true, speed: 0.7 });
    for (const p of [0, 0.3, 1.1, 7.9]) {
      for (const u of [0, 0.25, 0.5, 0.75, 1]) {
        for (const v of [0, 0.5, 1]) {
          const t = fieldAt(f, u, v, p);
          assert.ok(t >= 0 && t <= 1, `${m.id} out of range: ${t} at u=${u} v=${v} p=${p}`);
          assert.ok(Number.isFinite(t), `${m.id} produced ${t}`);
        }
      }
    }
  }
});

test("every mode yields a valid hex for every cell", () => {
  for (const m of FILL_MODES) {
    const f = g({ mode: m.id, animated: true });
    for (const [x, y] of [[0, 0], [7, 1], [23, 3]] as const) {
      const c = fillColorAt(f, x, y, 24, 4, 1234, "s");
      assert.match(c, /^#[0-9a-f]{6}$/, `${m.id} produced ${c}`);
    }
  }
});

test("two-dimensional modes actually vary down the rows", () => {
  // Sampled off-centre and on adjacent rows: a radial field is symmetric about
  // its origin, so the top and bottom rows of an even grid are equidistant and
  // legitimately identical.
  for (const m of ["radial", "conic", "diamond", "spiral", "ripple", "plasma"] as const) {
    const f = g({ mode: m, scale: 2, origin: [0.2, 0.15] });
    const a = fillColorAt(f, 5, 0, 24, 4, 0, "s");
    const b = fillColorAt(f, 5, 2, 24, 4, 0, "s");
    assert.notEqual(a, b, `${m} is flat down the bar`);
  }
});

test("a radial field is symmetric about its origin, by construction", () => {
  const f = g({ mode: "radial", origin: [0.5, 0.5] });
  assert.equal(
    fillColorAt(f, 5, 0, 24, 4, 0, "s"),
    fillColorAt(f, 5, 3, 24, 4, 0, "s"),
    "equidistant cells must match; this is the property, not a bug",
  );
});

test("a static fill is byte-identical between renders", () => {
  const f = g({ mode: "plasma", animated: false });
  assert.equal(fillColorAt(f, 3, 1, 20, 2, 0, "s"), fillColorAt(f, 3, 1, 20, 2, 99_999, "s"));
});

test("cells sample bilinearly and clamp at the edges", () => {
  const m = { w: 2, h: 2, data: ["#000000", "#ffffff", "#ffffff", "#000000"] };
  assert.equal(sampleCells(m, 0, 0), "#000000");
  assert.equal(sampleCells(m, 1, 0), "#ffffff");
  assert.equal(sampleCells(m, 0.5, 0.5), "#808080", "the centre averages all four");
  assert.equal(sampleCells(m, -1, -1), "#000000", "out of range clamps");
});

test("rotate picks a stable palette per bucket", () => {
  const a = [{ color: "#111111", pos: 0 }], b = [{ color: "#222222", pos: 0 }];
  const f = g({ rotate: { palettes: [a, b], every: "daily" } });
  const day1 = pickPalette(f, 86_400_000 * 3 + 100, "");
  const day1b = pickPalette(f, 86_400_000 * 3 + 9_000_000, "");
  const day2 = pickPalette(f, 86_400_000 * 4 + 100, "");
  assert.deepEqual(day1, day1b, "the same day must not re-roll");
  assert.notDeepEqual(day1, day2, "a new day should move on");
});

test("session rotation is stable for one id and varies across ids", () => {
  const pal = [[{ color: "#111111", pos: 0 }], [{ color: "#222222", pos: 0 }],
               [{ color: "#333333", pos: 0 }], [{ color: "#444444", pos: 0 }]];
  const f = g({ rotate: { palettes: pal, every: "session" } });
  assert.deepEqual(pickPalette(f, 1, "alpha"), pickPalette(f, 999_999, "alpha"));
  const seen = new Set(["a", "b", "c", "d", "e", "f"].map((s) => pickPalette(f, 0, s)[0]!.color));
  assert.ok(seen.size > 1, "different sessions should not collapse to one palette");
});

test("rainbow ignores stops and walks the hue wheel", () => {
  const f = g({ mode: "rainbow", stops: [{ color: "#000000", pos: 0 }] });
  const a = fillColorAt(f, 0, 0, 12, 1, 0, "s");
  const b = fillColorAt(f, 6, 0, 12, 1, 0, "s");
  assert.notEqual(a, b);
  assert.notEqual(a, "#000000", "the single stop must not win");
  assert.match(hsl2hex(0, 1, 0.5), /^#[0-9a-f]{6}$/);
});

test("kind none paints nothing at all", () => {
  assert.equal(fillColorAt({ ...DEFAULT_FILL, kind: "none" }, 0, 0, 10, 1, 0, ""), "");
});

test("a v1 config migrates its gradients into fills", () => {
  const out = parseConfig({
    version: 1,
    breakpoints: [{ id: "xs", minCols: 0 }],
    theme: { terminalGradient: { from: "#111111", to: "#222222", animated: true, speed: 0.4 } },
    rows: [{ id: "r", tiles: [{ id: "a", type: "model",
      style: { gradient: { from: "#330000", to: "#003300", animated: false, speed: 0.25 } } }] }],
  });
  assert.equal(out.version, CONFIG_VERSION);
  assert.equal(out.theme.terminalFill?.stops[0]!.color, "#111111");
  assert.equal(out.theme.terminalFill?.animated, true);
  assert.equal(out.rows[0]!.tiles[0]!.style.fill?.stops[1]!.color, "#003300");
});

test("the band emits one half-block per column with two colours", () => {
  const cfg = parseConfig({
    version: 2, breakpoints: [{ id: "xs", minCols: 0 }],
    rows: [{ id: "r", tiles: [{ id: "b", type: "fill-band", props: { width: 12 },
      style: { fill: { kind: "gradient", mode: "radial",
        stops: [{ color: "#000000", pos: 0 }, { color: "#ffffff", pos: 1 }],
        angle: 0, origin: [0.5, 0.5], animated: false, speed: 0.25, scale: 1 } } }] }],
  });
  const line = renderAnsi(cfg, { cc: {}, local: { now: new Date(0) }, columns: 80 })[0]!;
  assert.equal((line.match(/▀/g) ?? []).length, 12);
  assert.ok(new Set(line.match(/38;2;[0-9;]+/g) ?? []).size > 1, "upper pixels must vary");
  assert.ok(new Set(line.match(/48;2;[0-9;]+/g) ?? []).size > 1, "lower pixels must vary");
});
