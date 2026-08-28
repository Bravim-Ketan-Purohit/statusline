import { test } from "node:test";
import assert from "node:assert/strict";
import { registry } from "../src/tiles/registry.js";
import { projectCap, humanDelta } from "../src/tiles/fiveHourBar.js";
const empty = { cc: {}, local: { now: new Date() }, columns: 200 };
/**
 * Clock is Tier 1 and reads no stdin field, so it legitimately always renders.
 * Every OTHER tile must vanish rather than draw an empty box.
 */
const DATA_INDEPENDENT = new Set(["clock"]);
test("data-dependent tiles render nothing on empty data (no empty boxes)", () => {
    for (const [id, mod] of registry) {
        if (DATA_INDEPENDENT.has(id))
            continue;
        assert.equal(mod.render(mod.defaultProps, empty, "full").length, 0, `${id} should render nothing with no data`);
    }
});
test("clock renders even with no stdin, since it depends on none", () => {
    assert.ok(registry.get("clock").render({ tz: "America/Chicago", hour12: true, showZone: true }, empty, "full").length > 0);
});
test("context bar disappears when used_percentage is null", () => {
    const mod = registry.get("context-bar");
    const data = {
        cc: { context_window: { used_percentage: null, current_usage: null } },
        local: {}, columns: 200,
    };
    assert.equal(mod.render(mod.defaultProps, data, "full").length, 0);
});
test("5h bar disappears when rate_limits is absent (API-key user)", () => {
    const mod = registry.get("five-hour-bar");
    assert.equal(mod.render(mod.defaultProps, { cc: {}, local: {}, columns: 200 }, "full").length, 0);
});
test("context bar percentage is column-stable from 0 to 100", () => {
    const mod = registry.get("context-bar");
    const widths = [0, 5, 42, 100].map((p) => mod.render({ width: 8, showTokens: false, warnAt: 200 }, { cc: { context_window: { used_percentage: p } }, local: {}, columns: 200 }, "full")
        .map((s) => s.text).join("").length);
    assert.equal(new Set(widths).size, 1, `expected stable width, got ${widths}`);
});
test("burn projection suppresses noise but reports when meaningful", () => {
    const now = 1_000_000;
    assert.equal(projectCap(5, now + 5 * 3600 - 120, now).capEta, null, "2 min in = too early");
    assert.equal(projectCap(0.5, now + 3600, now).capEta, null, "0.5% = nothing to extrapolate");
    assert.ok(projectCap(40, now + 3 * 3600, now).capEta, "2h in at 40% = real number");
    assert.equal(projectCap(40, now - 10, now), null, "window already reset");
});
test("humanDelta formats", () => {
    assert.equal(humanDelta(0), "0s");
    assert.equal(humanDelta(90), "1m");
    assert.equal(humanDelta(3720), "1h02m");
});
