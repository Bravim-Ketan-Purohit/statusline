import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeTmux, tmuxConfSnippet } from "../src/adapters/tmux.js";
import { renderTmux } from "../src/render.js";
import { parseConfig } from "../src/schema.js";
import type { RuntimeData } from "../src/runtime.js";

const cfg = parseConfig({
  version: 1,
  breakpoints: [{ id: "xs", minCols: 0 }],
  targets: { tmux: { enabled: true, maxWidth: 200 } },
  rows: [{ id: "r", tiles: [
    { id: "t1", type: "pr", action: "play_pause" },
    { id: "t2", type: "text", props: { text: "a#b" } },
  ]}],
});
const data: RuntimeData = {
  cc: { pr: { number: 482, url: "https://x/482", review_state: "approved" } },
  local: {}, columns: 200,
};

test("escapeTmux doubles # so tmux does not read content as syntax", () => {
  assert.equal(escapeTmux("PR #1"), "PR ##1");
  assert.equal(escapeTmux("##"), "####");
  assert.equal(escapeTmux("plain"), "plain");
});

test("literal # in tile content is escaped in the emitted format string", () => {
  const out = renderTmux(cfg, data);
  assert.ok(out.includes("##482"), "PR number must emit ##482");
  assert.ok(out.includes("a##b"), "custom text must escape its #");
});

test("a tile with an action is wrapped in range=user and closed", () => {
  const out = renderTmux(cfg, data);
  assert.match(out, /#\[range=user\|play_pause\]/);
  assert.ok(out.includes("#[norange]"));
});

test("a tile without an action gets no range marker", () => {
  const plain = parseConfig({
    version: 1, breakpoints: [{ id: "xs", minCols: 0 }],
    rows: [{ id: "r", tiles: [{ id: "t", type: "text", props: { text: "hi" } }] }],
  });
  assert.ok(!renderTmux(plain, { cc: {}, local: {}, columns: 200 }).includes("range=user"));
});

test("the conf snippet carries mouse, the binding, and the interval", () => {
  const s = tmuxConfSnippet(cfg);
  assert.match(s, /set -g mouse on/);
  assert.match(s, /MouseDown1Status run-shell/);
  assert.match(s, /#\{mouse_status_range\}/);
  assert.match(s, /status-right "#\(statusline tmux\)"/);
});
