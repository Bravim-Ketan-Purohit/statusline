import { test } from "node:test";
import assert from "node:assert/strict";
import { stripCredentials, exportBase64 } from "../dist/handoff.js";
import { isAction, TMUX_ALIAS, ACTIONS } from "../dist/actions.js";
import { parseConfig } from "@statusline/core";

const cfg = parseConfig({
  version: 1,
  breakpoints: [{ id: "xs", minCols: 0 }],
  rows: [{ id: "r", tiles: [
    { id: "a", type: "model" },
    { id: "b", type: "ci", props: { apiToken: "SECRET", ghSecret: "X", label: "keep me" } },
  ]}],
});

test("credentials never survive an export", () => {
  const { config, required } = stripCredentials(cfg);
  const json = JSON.stringify(config);
  assert.ok(!json.includes("SECRET"), "apiToken leaked");
  assert.ok(!json.includes('"ghSecret"'), "ghSecret leaked");
  assert.ok(json.includes("keep me"), "non-credential props must survive");
  assert.deepEqual(required, ["ci"]);
});

test("the base64 payload carries requiredCredentials, not the values", () => {
  const decoded = JSON.parse(Buffer.from(exportBase64(cfg), "base64").toString("utf8"));
  assert.deepEqual(decoded.requiredCredentials, ["ci"]);
  assert.ok(!JSON.stringify(decoded).includes("SECRET"));
});

test("the action allowlist is closed", () => {
  for (const a of ACTIONS) assert.ok(isAction(a));
  for (const bad of ["rm", "play_pause; rm -rf /", "", "PLAY_PAUSE", "../../etc/passwd"]) {
    assert.ok(!isAction(bad), `${bad} must not be an action`);
  }
});

test("tmux aliases resolve to real actions and stay inside 15 bytes", () => {
  for (const [alias, target] of Object.entries(TMUX_ALIAS)) {
    assert.ok(isAction(target), `${alias} -> ${target}`);
    assert.ok(Buffer.byteLength(alias) <= 15, `${alias} exceeds tmux's range cap`);
  }
});
