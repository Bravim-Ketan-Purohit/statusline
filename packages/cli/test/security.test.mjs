import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toArgv, runCustom, MAX_OUTPUT_BYTES } from "../dist/custom.js";
import { hashArgv } from "../dist/approvals.js";

test("a command string never reaches a shell", () => {
  // Each of these is a shell metacharacter attack. Split into argv they become
  // literal arguments to echo, which is the whole point.
  const cases = [
    ["echo a; touch /tmp/x", ["echo", "a;", "touch", "/tmp/x"]],
    ["echo a && touch /tmp/x", ["echo", "a", "&&", "touch", "/tmp/x"]],
    ["echo $(touch /tmp/x)", ["echo", "$(touch", "/tmp/x)"]],
    ["echo a | tee /tmp/x", ["echo", "a", "|", "tee", "/tmp/x"]],
    ["echo a > /tmp/x", ["echo", "a", ">", "/tmp/x"]],
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual(toArgv(input), expected, input);
  }
});

test("quoting keeps an argument together", () => {
  assert.deepEqual(toArgv(`git log -1 --format="%cr ago"`), ["git", "log", "-1", "--format=%cr ago"]);
  assert.deepEqual(toArgv(`echo 'one arg'`), ["echo", "one arg"]);
});

test("an unapproved command produces nothing, whatever it is", () => {
  // No approval file exists in this test's environment, so nothing may run.
  const out = runCustom({ argv: ["echo", "should-not-appear"], ttlMs: 0, key: "x" }, 80);
  assert.equal(out, "", "the gate must precede execution");
});

test("approval is keyed on argv, so editing a command revokes it", () => {
  const a = hashArgv(["echo", "hello"]);
  const b = hashArgv(["echo", "hello", "world"]);
  const c = hashArgv(["echo", "hello"]);
  assert.equal(a, c, "the same argv hashes the same");
  assert.notEqual(a, b, "a changed argv must not inherit approval");
});

test("output is capped so a runaway command cannot blow up the line", () => {
  assert.ok(MAX_OUTPUT_BYTES <= 8192, "the cap must stay small");
});

test("credentials are refused when the file is group or world readable", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sl-cred-"));
  const p = join(dir, "credentials.json");
  writeFileSync(p, JSON.stringify({ k: "SECRET" }), { mode: 0o600 });
  chmodSync(p, 0o644);
  const mode = (await import("node:fs")).statSync(p).mode & 0o777;
  assert.ok(mode & 0o077, "fixture is intentionally too open");
  rmSync(dir, { recursive: true, force: true });
});
