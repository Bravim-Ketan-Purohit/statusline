import { test } from "node:test";
import assert from "node:assert/strict";
import { ConfigSchema, TileSchema, migrate, CONFIG_VERSION } from "../src/schema.js";
test("tmux action id is capped at 15 bytes", () => {
    const base = { id: "a", type: "clock" };
    assert.ok(TileSchema.safeParse({ ...base, action: "play_pause" }).success);
    assert.ok(TileSchema.safeParse({ ...base, action: "x".repeat(15) }).success);
    assert.ok(!TileSchema.safeParse({ ...base, action: "x".repeat(16) }).success);
    assert.ok(!TileSchema.safeParse({ ...base, action: "\u{1F600}".repeat(4) }).success, "16 bytes of emoji must fail: the cap is bytes, not chars");
});
test("hex colours are validated", () => {
    assert.ok(!TileSchema.safeParse({ id: "a", type: "clock", style: { bg: "red" } }).success);
    assert.ok(TileSchema.safeParse({ id: "a", type: "clock", style: { bg: "#ff0000" } }).success);
    assert.ok(TileSchema.safeParse({ id: "a", type: "clock", style: { bg: "palette:accent" } }).success);
});
test("migrate refuses a config from the future", () => {
    assert.throws(() => migrate({ version: CONFIG_VERSION + 1 }), /newer than this build/);
    assert.doesNotThrow(() => migrate({ version: CONFIG_VERSION }));
});
test("minimal config fills defaults", () => {
    const r = ConfigSchema.parse({ version: 1, breakpoints: [{ id: "xs", minCols: 0 }] });
    assert.equal(r.theme.colorMode, "truecolor");
    assert.equal(r.targets.claudeCode.style, "pills");
    assert.equal(r.daemon.port, 7717);
});
