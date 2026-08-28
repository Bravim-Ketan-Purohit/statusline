import { span } from "../spans.js";
const FILLED = "█";
const EMPTY = "░";
export function barColor(pct) {
    if (pct < 60)
        return "#87d787";
    if (pct < 80)
        return "#d7af5f";
    if (pct < 92)
        return "#ffaf5f";
    return "#ff5f5f";
}
export function renderBar(pct, width) {
    const clamped = Math.max(0, Math.min(100, pct));
    const filled = Math.max(0, Math.min(width, Math.round((clamped * width) / 100)));
    return { filled: FILLED.repeat(filled), empty: EMPTY.repeat(width - filled) };
}
const fmtTokens = (n) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : `${Math.round(n / 1000)}k`;
export const contextBarTile = {
    id: "context-bar",
    displayName: "Context window bar",
    category: "session",
    tier: 0,
    capabilities: [],
    defaultProps: { width: 8, showTokens: true, warnAt: 80 },
    render(props, { cc }, mode) {
        const pct = cc.context_window?.used_percentage;
        // null before the first API call and again right after /compact.
        if (pct === null || pct === undefined)
            return [];
        const w = mode === "compact" ? Math.max(4, Math.floor(props.width / 2)) : props.width;
        const { filled, empty } = renderBar(pct, w);
        const c = barColor(pct);
        const out = [
            span(filled, { fg: c }),
            span(empty, { fg: "#4e4e4e" }),
            // %3.0f keeps the number column-stable from 0% to 100% so it never jitters.
            span(` ${String(Math.round(pct)).padStart(3, " ")}%`, { fg: c }),
        ];
        if (mode === "full" && props.showTokens) {
            const tok = cc.context_window?.total_input_tokens ?? 0;
            const size = cc.context_window?.context_window_size ?? 200_000;
            out.push(span(` ${fmtTokens(tok)}/${fmtTokens(size)}`, { dim: true }));
        }
        if (pct >= props.warnAt)
            out.push(span("  ⚠ compact soon", { fg: "#ff5f5f" }));
        return out;
    },
};
