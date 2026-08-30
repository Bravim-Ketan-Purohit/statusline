import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ManifestSchema, manifestToTile, evalPath, fillTemplate, evalPredicate,
} from "../src/manifest.js";
import { BUILTIN_IDS } from "../src/tiles/registry.js";
import type { RuntimeData } from "../src/runtime.js";

test("the path subset covers what the three real integrations needed", () => {
  // Sentry: a top-level array, and a string field that must be summed
  const sentry = [{ count: "412" }, { count: "88" }, { count: "3" }];
  assert.equal(evalPath(sentry, "$.length"), 3);
  assert.equal(evalPath(sentry, "$[*].count.sum"), 503);
  // Vercel: an object holding an array, indexed, then two fields
  const vercel = { deployments: [{ state: "READY", created: 1000, ready: 96000 }] };
  assert.equal(evalPath(vercel, "$.deployments[0].state"), "READY");
  // Linear: deep nesting, plus counting members by a field value
  const linear = { data: { viewer: { assignedIssues: { nodes: [
    { state: { type: "started" } }, { state: { type: "started" } }, { state: { type: "review" } },
  ]}}}};
  assert.equal(evalPath(linear, "$.data.viewer.assignedIssues.nodes.length"), 3);
  const nodes = evalPath(linear, "$.data.viewer.assignedIssues.nodes");
  assert.equal(evalPath(nodes, "$[*].state.type=started.count"), 2);
});

test("a bad path yields undefined rather than throwing", () => {
  for (const p of ["$.nope.deep", "$.a[9].b", "notapath", "$", "$.length"]) {
    assert.doesNotThrow(() => evalPath({ a: [] }, p), p);
  }
  assert.equal(evalPath({}, "$.missing"), undefined);
});

test("templates leave unknown names empty, never the word undefined", () => {
  assert.equal(fillTemplate("{{a}} of {{b}}", { a: 3 }), "3 of ");
  assert.equal(fillTemplate("{{ a }}", { a: "x" }), "x", "whitespace inside the braces is allowed");
  assert.ok(!fillTemplate("{{nope}}", {}).includes("undefined"));
});

test("the predicate language is deliberately tiny", () => {
  const v = { count: 0, name: "ready" };
  assert.equal(evalPredicate("count == 0", v), true);
  assert.equal(evalPredicate("count != 0", v), false);
  assert.equal(evalPredicate("count > 5", v), false);
  assert.equal(evalPredicate("count", v), false, "0 is falsy");
  assert.equal(evalPredicate("name == ready", v), true);
  // It must not be an expression evaluator.
  assert.equal(evalPredicate("1); process.exit(1", v), false);
});

test("a manifest id must be safe as both a tile id and a filename", () => {
  const base = { name: "X", fetch: { type: "http", url: "https://x.test" }, render: { full: "y" } };
  assert.ok(ManifestSchema.safeParse({ ...base, id: "my-widget" }).success);
  for (const bad of ["My_Widget", "../escape", "with space", "UPPER", ""]) {
    assert.ok(!ManifestSchema.safeParse({ ...base, id: bad }).success, bad);
  }
});

test("a command manifest must be argv, never a shell string", () => {
  const base = { id: "w", name: "X", render: { full: "y" } };
  assert.ok(!ManifestSchema.safeParse({ ...base, fetch: { type: "command", run: "ls; rm -rf /" } }).success);
  assert.ok(ManifestSchema.safeParse({ ...base, fetch: { type: "command", run: ["ls", "-la"] } }).success);
});

test("BUILTIN_IDS is fixed, so a registered manifest cannot collide with itself", () => {
  assert.ok(BUILTIN_IDS.has("clock"));
  assert.ok(!BUILTIN_IDS.has("some-manifest-widget"));
  const before = BUILTIN_IDS.size;
  assert.equal(BUILTIN_IDS.size, before, "it must not grow as manifests register");
});

test("a manifest tile renders, hides, and survives junk", () => {
  const m = ManifestSchema.parse({
    id: "w", name: "W", fetch: { type: "http", url: "https://x.test" },
    extract: { count: "$.length" },
    render: { full: "{{count}} issues", compact: "{{count}}", hideWhen: "count == 0" },
  });
  const tile = manifestToTile(m);
  const d = (payload: unknown): RuntimeData =>
    ({ cc: {}, local: {}, columns: 200, custom: { "manifest:w": JSON.stringify(payload) } });

  assert.equal(tile.render({}, d([1, 2, 3]), "full").map((s) => s.text).join(""), "3 issues");
  assert.equal(tile.render({}, d([1, 2, 3]), "compact").map((s) => s.text).join(""), "3");
  assert.equal(tile.render({}, d([]), "full").length, 0, "hideWhen removed it");
  assert.equal(tile.render({}, { cc: {}, local: {}, columns: 200 }, "full").length, 0, "no data at all");
  assert.doesNotThrow(() => tile.render({}, {
    cc: {}, local: {}, columns: 200, custom: { "manifest:w": "not json" } }, "full"));
});
