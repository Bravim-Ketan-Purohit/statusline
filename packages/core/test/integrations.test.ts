import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../src/schema.js";
import { renderAnsi } from "../src/render.js";
import { registry } from "../src/tiles/registry.js";
import type { RuntimeData } from "../src/runtime.js";

const bare: RuntimeData = { cc: {}, local: {}, columns: 200 };
const IDS = ["linear-assigned", "linear-started", "linear-review", "linear-triage",
             "sentry-issues", "sentry-events", "deploy-status", "deploy-duration", "deploy-url"];

test("every network tile is silent without data", () => {
  for (const id of IDS) {
    const m = registry.get(id)!;
    assert.equal(m.render(m.defaultProps, bare, "full").length, 0, id);
  }
});

test("an unavailable service is silent even if a stale count survives", () => {
  const m = registry.get("linear-assigned")!;
  const d: RuntimeData = { ...bare, linear: { available: false, assigned: 7 } };
  assert.equal(m.render(m.defaultProps, d, "full").length, 0,
    "available:false must win over a leftover number");
});

test("Linear counts render, and zero counts stay hidden", () => {
  const d: RuntimeData = { ...bare, linear: { available: true, assigned: 4, started: 1, review: 0, triage: 6 } };
  const g = (id: string) => registry.get(id)!.render({}, d, "full").map((s) => s.text).join("");
  assert.equal(g("linear-assigned"), "4");
  assert.equal(g("linear-started"), "1");
  assert.equal(g("linear-review"), "", "an empty review queue is not news");
  assert.equal(g("linear-triage"), "6");
});

test("assigned renders zero, because an empty inbox is information", () => {
  const d: RuntimeData = { ...bare, linear: { available: true, assigned: 0 } };
  assert.equal(registry.get("linear-assigned")!.render({}, d, "full").map((s) => s.text).join(""), "0");
});

test("Sentry reddens past its threshold and abbreviates event counts", () => {
  const m = registry.get("sentry-issues")!;
  const at = (n: number) => m.render({ warnAt: 10 }, { ...bare, sentry: { available: true, issues: n } }, "full");
  assert.equal(at(3)[0]!.fg, undefined, "a few issues is not an alarm");
  assert.equal(at(25)[0]!.fg, "#ff5f5f");
  const ev = registry.get("sentry-events")!;
  const txt = (n: number) => ev.render({}, { ...bare, sentry: { available: true, events24h: n } }, "full")
    .map((s) => s.text).join("");
  assert.equal(txt(940), "940 /24h");
  assert.equal(txt(12_400), "12.4k /24h");
});

test("deploy states map to their own icon and colour", () => {
  const m = registry.get("deploy-status")!;
  const at = (state: string) => m.render({}, { ...bare, deploy: { available: true, state } }, "full")
    .map((s) => s.text).join("");
  assert.match(at("READY"), /ready/);
  assert.match(at("BUILDING"), /building/);
  assert.match(at("ERROR"), /failed/);
  assert.match(at("SOMETHING_NEW"), /something_new/, "an unknown state degrades, it does not crash");
});

test("the preview URL is a real OSC 8 link in the terminal", () => {
  const cfg = parseConfig({
    version: 2, breakpoints: [{ id: "xs", minCols: 0 }],
    rows: [{ id: "r", tiles: [{ id: "u", type: "deploy-url" }] }],
  });
  const out = renderAnsi(cfg, { ...bare, deploy: { available: true, url: "https://x.vercel.app" } }).join("");
  assert.ok(out.includes("\x1b]8;;https://x.vercel.app"), "must emit an OSC 8 hyperlink");
});

test("a malformed API response never produces a broken tile", () => {
  // Whatever the shape, an unparsed field is absent, and absent renders nothing.
  for (const junk of [{}, { available: true }, { available: true, issues: undefined }]) {
    const m = registry.get("sentry-issues")!;
    assert.doesNotThrow(() => m.render({ warnAt: 5 }, { ...bare, sentry: junk as never }, "full"));
  }
});
