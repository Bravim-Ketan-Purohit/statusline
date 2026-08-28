const RESET = "\x1b[0m";
export function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
    ];
}
/** xterm-256 cube quantization. */
export function rgbTo256(r, g, b) {
    if (r === g && g === b) {
        if (r < 8)
            return 16;
        if (r > 248)
            return 231;
        return Math.round(((r - 8) / 247) * 24) + 232;
    }
    const c = (v) => Math.round((v / 255) * 5);
    return 16 + 36 * c(r) + 6 * c(g) + c(b);
}
/** Nearest of the 16 base ANSI colours, by squared distance. */
const ANSI16 = [
    [0, 0, 0], [128, 0, 0], [0, 128, 0], [128, 128, 0],
    [0, 0, 128], [128, 0, 128], [0, 128, 128], [192, 192, 192],
    [128, 128, 128], [255, 0, 0], [0, 255, 0], [255, 255, 0],
    [0, 0, 255], [255, 0, 255], [0, 255, 255], [255, 255, 255],
];
export function rgbTo16(r, g, b) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < ANSI16.length; i++) {
        const [cr, cg, cb] = ANSI16[i];
        const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
        if (d < bestD) {
            bestD = d;
            best = i;
        }
    }
    return best;
}
export function resolveColor(ref, cfg) {
    if (!ref)
        return undefined;
    if (ref.startsWith("palette:"))
        return cfg.theme.palette[ref.slice(8)];
    return ref;
}
function sgr(hex, ground, mode) {
    const [r, g, b] = hexToRgb(hex);
    if (mode === "truecolor")
        return `\x1b[${ground === "fg" ? 38 : 48};2;${r};${g};${b}m`;
    if (mode === "ansi256")
        return `\x1b[${ground === "fg" ? 38 : 48};5;${rgbTo256(r, g, b)}m`;
    const i = rgbTo16(r, g, b);
    const base = ground === "fg" ? 30 : 40;
    return i < 8 ? `\x1b[${base + i}m` : `\x1b[${base + 60 + (i - 8)}m`;
}
/** Two-stop horizontal gradient across a tile's characters. */
function gradientAt(from, to, t) {
    const [r1, g1, b1] = hexToRgb(from);
    const [r2, g2, b2] = hexToRgb(to);
    const mix = (a, b) => Math.round(a + (b - a) * t);
    const hx = (v) => v.toString(16).padStart(2, "0");
    return `#${hx(mix(r1, r2))}${hx(mix(g1, g2))}${hx(mix(b1, b2))}`;
}
export function renderTileAnsi(rt, cfg, opts) {
    const mode = cfg.theme.colorMode;
    const bg = resolveColor(rt.style.bg, cfg);
    const fg = resolveColor(rt.style.fg, cfg);
    const grad = rt.style.gradient;
    const padStr = " ".repeat(opts.pad);
    const base = (bg ? sgr(bg, "bg", mode) : "") + (fg ? sgr(fg, "fg", mode) : "");
    let out = base + padStr;
    if (grad) {
        const from = resolveColor(grad.from, cfg);
        const to = resolveColor(grad.to, cfg);
        const total = rt.spans.reduce((n, s) => n + [...s.text].length, 0);
        let i = 0;
        for (const s of rt.spans) {
            for (const ch of s.text) {
                const t = total > 1 ? i / (total - 1) : 0;
                out += sgr(gradientAt(from, to, t), "fg", mode) + ch;
                i++;
            }
        }
    }
    else {
        for (const s of rt.spans)
            out += spanAnsi(s, cfg, base);
    }
    return out + base + padStr + RESET;
}
function spanAnsi(s, cfg, base) {
    const mode = cfg.theme.colorMode;
    let pre = "";
    const fg = resolveColor(s.fg, cfg);
    if (fg)
        pre += sgr(fg, "fg", mode);
    const bg = resolveColor(s.bg, cfg);
    if (bg)
        pre += sgr(bg, "bg", mode);
    if (s.bold)
        pre += "\x1b[1m";
    if (s.dim)
        pre += "\x1b[2m";
    const body = s.link ? osc8(s.link, s.text) : s.text;
    // Return to the tile's own colours rather than a bare reset, so the pill
    // background survives an inner colour change.
    return pre ? pre + body + RESET + base : body;
}
export function osc8(url, text) {
    return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}
export function renderRowAnsi(kept, cfg, opts) {
    return kept.map((t) => renderTileAnsi(t, cfg, opts)).join(" ".repeat(opts.gap));
}
