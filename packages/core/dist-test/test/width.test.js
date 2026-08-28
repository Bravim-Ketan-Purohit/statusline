import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { displayWidth, stripAnsi, truncateToWidth } from "../src/width.js";
const here = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(readFileSync(join(here, "..", "..", "test", "fixtures.json"), "utf8"));
test("displayWidth matches every fixture", () => {
    for (const f of fixtures) {
        assert.equal(displayWidth(f.s), f.w, `${f.why}: ${JSON.stringify(f.s)}`);
    }
});
test("never uses String.length semantics", () => {
    assert.notEqual(displayWidth("你好"), "你好".length);
    assert.equal(displayWidth("你好"), 4);
});
test("stripAnsi removes SGR and OSC 8 but keeps the text", () => {
    const ESC = String.fromCharCode(27);
    const s = `${ESC}[1m${ESC}]8;;http://a${ESC}\\hi${ESC}]8;;${ESC}\\${ESC}[0m`;
    assert.equal(stripAnsi(s), "hi");
});
test("truncateToWidth respects display width, not char count", () => {
    assert.equal(displayWidth(truncateToWidth("你好世界", 5)), 5);
    assert.equal(truncateToWidth("hello", 10), "hello");
    assert.ok(truncateToWidth("hello world", 8).endsWith("…"));
});
