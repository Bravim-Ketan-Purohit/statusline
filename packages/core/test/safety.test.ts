import { test } from "node:test";
import assert from "node:assert/strict";
import { isDangerous, DEFAULT_DANGER_PATTERNS } from "../src/danger.js";
import { parseConfig } from "../src/schema.js";
import { renderAnsi } from "../src/render.js";
import { renderWeb } from "../src/adapters/web.js";
import { renderTmux } from "../src/render.js";
import { registry } from "../src/tiles/registry.js";
import type { RuntimeData } from "../src/runtime.js";

const P = DEFAULT_DANGER_PATTERNS;

test("a pattern matches a whole segment, never a substring", () => {
  for (const v of ["prod", "production", "eks-prod-1", "acme_prod_2",
                   "arn:aws:eks:us-east-1:1:cluster/prod", "my.live.cluster"]) {
    assert.equal(isDangerous(v, P), true, `${v} should be dangerous`);
  }
  // These are the ones a naive includes() would get wrong.
  for (const v of ["product", "product-api", "reproduce", "prodigy", "nonprod",
                   "staging", "dev", "livery", ""]) {
    assert.equal(isDangerous(v, P), false, `${v} must NOT be dangerous`);
  }
  assert.equal(isDangerous(undefined, P), false);
});

test("an empty pattern never matches everything", () => {
  assert.equal(isDangerous("anything", ["", "  "]), false);
});

const cfg = parseConfig({
  version: 2, breakpoints: [{ id: "xs", minCols: 0 }],
  rows: [{ id: "r", tiles: [
    { id: "k", type: "kube-context" }, { id: "a", type: "aws-profile" },
    { id: "g", type: "gcp-project" }, { id: "p", type: "protected-branch" },
  ]}],
});
const data = (kube?: string, aws?: string, gcp?: string, branch?: string): RuntimeData => ({
  cc: {}, local: {}, columns: 200,
  git: branch ? { branch } : undefined,
  system: { kubeContext: kube, awsProfile: aws, gcpProject: gcp },
  custom: { __danger: JSON.stringify(P), __protected: JSON.stringify(["main", "master"]) },
});

test("every safety tile renders nothing when its context is absent", () => {
  for (const id of ["kube-context", "aws-profile", "gcp-project", "protected-branch"]) {
    const mod = registry.get(id)!;
    assert.equal(mod.render(mod.defaultProps, { cc: {}, local: {}, columns: 200 }, "full").length, 0, id);
  }
});

test("the danger colour appears in the terminal only for a production context", () => {
  const red = "38;2;255;95;95";
  const hot = renderAnsi(cfg, data("cluster/acme-prod", "acme-prod", "acme-prod", "main")).join("");
  const cold = renderAnsi(cfg, data("kind-local", "sandbox", "acme-staging", "feat/x")).join("");
  assert.equal((hot.match(new RegExp(red, "g")) ?? []).length, 4, "all four should shout");
  assert.equal((cold.match(new RegExp(red, "g")) ?? []).length, 0, "none should shout");
});

test("danger overrides a tile's own colour rather than blending with it", () => {
  const styled = parseConfig({
    version: 2, breakpoints: [{ id: "xs", minCols: 0 }],
    rows: [{ id: "r", tiles: [{ id: "k", type: "kube-context",
      style: { fg: "#00ff00", bg: "#000000" } }] }],
  });
  const out = renderAnsi(styled, data("cluster/prod")).join("");
  // The tile's own colour still paints its padding -- that is the tile's
  // ground. What matters is that the danger colour is what immediately
  // precedes the text, so nothing the tile set can win over it.
  const beforeText = out.slice(0, out.indexOf("prod"));
  const lastFg = [...beforeText.matchAll(/38;2;[0-9;]+/g)].pop()?.[0];
  assert.equal(lastFg, "38;2;255;95;95", "danger must be the last colour set before the value");
  assert.match(beforeText.slice(beforeText.lastIndexOf("38;2;255;95;95")), /\x1b\[1m/,
    "and it must be bold");
});

test("the protected-branch tile is silent off a protected branch", () => {
  assert.equal(renderAnsi(cfg, data(undefined, undefined, undefined, "feat/x")).join("").length, 0);
  assert.ok(renderAnsi(cfg, data(undefined, undefined, undefined, "main")).join("").includes("main"));
});

test("all three adapters honour danger", () => {
  const d = data("cluster/prod", "prod", "prod", "main");
  assert.ok(renderAnsi(cfg, d).join("").includes("38;2;255;95;95"), "ansi");
  assert.ok(renderTmux(cfg, d).includes("#ff5f5f"), "tmux");
  const web = renderWeb(cfg, d);
  const spans = web.rows[0]!.tiles.flatMap((t) => t.spans);
  assert.ok(spans.some((s) => s.fg === "#ff5f5f" && s.bold), "web");
});

test("a long kube context shortens to its identifying tail", () => {
  const mod = registry.get("kube-context")!;
  const arn = "arn:aws:eks:us-east-1:481:cluster/acme-prod";
  const out = mod.render({ shortenPath: true }, data(arn), "full").map((s) => s.text).join("");
  assert.equal(out, "acme-prod");
  const full = mod.render({ shortenPath: false }, data(arn), "full").map((s) => s.text).join("");
  assert.equal(full, arn);
});
