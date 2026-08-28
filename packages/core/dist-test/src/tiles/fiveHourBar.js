import { span } from "../spans.js";
import { renderBar, barColor } from "./contextBar.js";
const WINDOW_SECONDS = 5 * 3600;
export function humanDelta(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h)
        return `${h}h${String(m).padStart(2, "0")}m`;
    return m ? `${m}m` : `${s}s`;
}
/**
 * Projects when the 5h cap would be hit at the current burn rate. Suppressed
 * while the numbers are too early or too noisy to carry information.
 */
export function projectCap(usedPct, resetsAt, nowSec, opts = { minElapsed: 600, minPct: 2, maxEta: 24 * 3600 }) {
    const remaining = resetsAt - nowSec;
    if (remaining <= 0)
        return null;
    const elapsed = WINDOW_SECONDS - remaining;
    const resetsIn = humanDelta(remaining);
    if (elapsed < opts.minElapsed || usedPct < opts.minPct)
        return { resetsIn, capEta: null };
    const rate = usedPct / elapsed;
    if (rate <= 0)
        return { resetsIn, capEta: null };
    const eta = (100 - usedPct) / rate;
    if (eta <= 0 || eta > opts.maxEta)
        return { resetsIn, capEta: null };
    return { resetsIn, capEta: humanDelta(eta) };
}
export const fiveHourBarTile = {
    id: "five-hour-bar",
    displayName: "5h limit bar",
    category: "session",
    tier: 0,
    capabilities: [],
    defaultProps: { width: 8, showReset: true, showProjection: true },
    render(props, { cc, local }, mode) {
        const fh = cc.rate_limits?.five_hour;
        // rate_limits is absent entirely for API-key users.
        const pct = fh?.used_percentage;
        if (pct === null || pct === undefined)
            return [];
        const w = mode === "compact" ? Math.max(4, Math.floor(props.width / 2)) : props.width;
        const { filled, empty } = renderBar(pct, w);
        const c = barColor(pct);
        const out = [
            span(filled, { fg: c }),
            span(empty, { fg: "#4e4e4e" }),
            span(` ${String(Math.round(pct)).padStart(3, " ")}%`, { fg: c }),
        ];
        if (mode === "full" && fh?.resets_at) {
            const nowSec = (local.now ?? new Date()).getTime() / 1000;
            const p = projectCap(pct, fh.resets_at, nowSec);
            if (p) {
                if (props.showReset) {
                    out.push(span(" resets ", { dim: true }));
                    out.push(span(p.resetsIn));
                }
                if (props.showProjection && p.capEta) {
                    out.push(span(" · cap ", { dim: true }));
                    out.push(span(`~${p.capEta}`));
                }
            }
        }
        return out;
    },
};
