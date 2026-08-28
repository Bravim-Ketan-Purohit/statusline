import { span } from "./spans.js";
import { displayWidth } from "./width.js";
import { getTile } from "./tiles/registry.js";
/** Pick the largest breakpoint whose minCols <= cols. */
export function resolveBreakpoint(bps, cols) {
    const sorted = [...bps].sort((a, b) => a.minCols - b.minCols);
    let chosen = sorted[0];
    for (const bp of sorted)
        if (cols >= bp.minCols)
            chosen = bp;
    return chosen;
}
/**
 * Sparse inheritance: walk breakpoints from smallest up to the active one,
 * merging each override in turn. A breakpoint records only what differs.
 */
export function effectiveOverride(tile, bps, activeId) {
    const sorted = [...bps].sort((a, b) => a.minCols - b.minCols);
    let hidden = false;
    let compact = false;
    let style = {};
    for (const bp of sorted) {
        const ov = tile.responsive[bp.id];
        if (ov && typeof ov === "object") {
            if (typeof ov.hidden === "boolean")
                hidden = ov.hidden;
            if (typeof ov.compact === "boolean")
                compact = ov.compact;
            if (ov.style)
                style = { ...style, ...ov.style };
        }
        if (bp.id === activeId)
            break;
    }
    return { hidden, compact, style };
}
/** Decorate a tile's value spans with its glyph and dim label. */
function decorate(style, value, mode) {
    const out = [];
    if (style.glyph)
        out.push(span(style.glyph + " "));
    if (style.label && mode === "full")
        out.push(span(style.label + " ", { dim: style.labelDim }));
    return [...out, ...value];
}
export function buildRow(cfg, rowIndex, data, cols) {
    const row = cfg.rows[rowIndex];
    if (!row)
        return [];
    const bp = resolveBreakpoint(cfg.breakpoints, cols);
    const out = [];
    for (const tile of row.tiles) {
        const mod = getTile(tile.type);
        if (!mod)
            continue; // unknown tile type -> skip, never crash the row
        const ov = effectiveOverride(tile, cfg.breakpoints, bp.id);
        if (ov.hidden)
            continue;
        const mode = ov.compact ? "compact" : "full";
        let value;
        try {
            value = mod.render({ ...mod.defaultProps, ...tile.props }, data, mode);
        }
        catch {
            continue; // a throwing tile disappears; it never takes the row with it
        }
        if (!value.length)
            continue; // missing field -> tile does not exist
        const style = { ...tile.style, ...ov.style };
        const spans = decorate(style, value, mode);
        out.push({
            tile,
            spans,
            width: spans.reduce((w, s) => w + displayWidth(s.text), 0),
            priority: tile.responsive.priority ?? 5,
            flex: tile.flex,
            style,
        });
    }
    return out;
}
/**
 * Priority overflow. While the assembled row exceeds the available columns,
 * drop the highest priority NUMBER (least important) and re-measure. Never
 * wrap, never truncate mid-tile.
 *
 * `gap` is the inter-tile separator width the adapter will insert. `pad` is
 * per-tile padding the adapter adds (1 each side for pills).
 */
export function fitRow(tiles, cols, gap, pad) {
    const items = [...tiles];
    const dropped = [];
    const measure = (list) => list.reduce((w, t) => w + t.width + pad * 2, 0) + Math.max(0, list.length - 1) * gap;
    if (cols <= 0)
        return { kept: items, dropped, width: measure(items) };
    while (items.length && measure(items) > cols) {
        // Ties resolve to the earliest index, which keeps ordering deterministic.
        let worst = 0;
        for (let i = 1; i < items.length; i++) {
            if (items[i].priority > items[worst].priority)
                worst = i;
        }
        dropped.push(items.splice(worst, 1)[0]);
    }
    return { kept: items, dropped, width: measure(items) };
}
