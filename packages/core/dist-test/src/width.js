/**
 * Display-width math. Every layout decision depends on this being right,
 * so it lives in core and is unit-tested against a fixture file.
 *
 * Rules (from the spec):
 *   - strip ANSI SGR and OSC 8 wrappers before measuring
 *   - East Asian Wide + Fullwidth  -> 2 columns
 *   - combining marks              -> 0 columns
 *   - emoji / variation selectors  -> 2 columns (terminals disagree; documented)
 *   - never use String.prototype.length
 */
// SGR (colour) sequences, plus OSC 8 hyperlink open/close wrappers.
const SGR = /\x1b\[[0-9;:]*m/g;
const OSC8 = /\x1b\]8;[^;]*;[^\x07\x1b]*(?:\x07|\x1b\\)/g;
// Any other CSI sequence we might emit (cursor ops etc.) measures as zero.
const CSI_OTHER = /\x1b\[[0-9;?]*[A-Za-z]/g;
export function stripAnsi(s) {
    return s.replace(OSC8, "").replace(SGR, "").replace(CSI_OTHER, "");
}
/** Inclusive code-point ranges that occupy two terminal columns. */
const WIDE_RANGES = [
    [0x1100, 0x115f], // Hangul Jamo init.
    [0x2e80, 0x303e], // CJK radicals, Kangxi
    [0x3041, 0x33ff], // Hiragana .. CJK compat
    [0x3400, 0x4dbf], // CJK ext A
    [0x4e00, 0x9fff], // CJK unified
    [0xa000, 0xa4cf], // Yi
    [0xac00, 0xd7a3], // Hangul syllables
    [0xf900, 0xfaff], // CJK compat ideographs
    [0xfe10, 0xfe19], // vertical forms
    [0xfe30, 0xfe6f], // CJK compat forms
    [0xff00, 0xff60], // fullwidth forms
    [0xffe0, 0xffe6], // fullwidth signs
    [0x1f300, 0x1f64f], // misc symbols & pictographs, emoticons
    [0x1f680, 0x1f6ff], // transport
    [0x1f900, 0x1f9ff], // supplemental symbols
    [0x1fa70, 0x1faff], // symbols extended-A
    [0x20000, 0x2fffd], // CJK ext B..
    [0x30000, 0x3fffd],
];
function inRanges(cp, ranges) {
    let lo = 0, hi = ranges.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const [a, b] = ranges[mid];
        if (cp < a)
            hi = mid - 1;
        else if (cp > b)
            lo = mid + 1;
        else
            return true;
    }
    return false;
}
function isCombining(cp) {
    return ((cp >= 0x0300 && cp <= 0x036f) || // combining diacriticals
        (cp >= 0x0483 && cp <= 0x0489) ||
        (cp >= 0x0591 && cp <= 0x05bd) ||
        (cp >= 0x0610 && cp <= 0x061a) ||
        (cp >= 0x064b && cp <= 0x065f) ||
        (cp >= 0x0e31 && cp <= 0x0e3a) ||
        (cp >= 0x1ab0 && cp <= 0x1aff) ||
        (cp >= 0x20d0 && cp <= 0x20f0) || // combining marks for symbols
        (cp >= 0xfe20 && cp <= 0xfe2f));
}
const ZERO_WIDTH = new Set([
    0x200b, 0x200c, 0x200d, // ZWSP, ZWNJ, ZWJ
    0xfeff, // BOM
    0x2060, // word joiner
]);
const VARIATION_SELECTOR_16 = 0xfe0f;
const VARIATION_SELECTOR_15 = 0xfe0e;
/**
 * Width of a single grapheme cluster. Splitting on graphemes first is what
 * makes combining marks and ZWJ emoji sequences fall out correctly: "👨‍👩‍👧"
 * is one cluster of width 2, not three emoji of width 6.
 */
export function graphemeWidth(g) {
    const cps = Array.from(g, (c) => c.codePointAt(0));
    if (cps.length === 0)
        return 0;
    // Text-presentation selector forces the narrow form.
    if (cps.includes(VARIATION_SELECTOR_15))
        return 1;
    // Emoji-presentation selector forces the wide form.
    if (cps.includes(VARIATION_SELECTOR_16))
        return 2;
    const base = cps[0];
    if (ZERO_WIDTH.has(base))
        return 0;
    if (isCombining(base))
        return 0;
    if (base < 0x20 || (base >= 0x7f && base < 0xa0))
        return 0; // control chars
    if (inRanges(base, WIDE_RANGES))
        return 2;
    return 1;
}
const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;
/** Display width in terminal columns, with ANSI/OSC 8 stripped first. */
export function displayWidth(s) {
    const plain = stripAnsi(s);
    let w = 0;
    if (segmenter) {
        for (const { segment } of segmenter.segment(plain))
            w += graphemeWidth(segment);
    }
    else {
        for (const ch of plain)
            w += graphemeWidth(ch);
    }
    return w;
}
/** Truncate to `cols` display columns, appending `ellipsis` if it had to cut. */
export function truncateToWidth(s, cols, ellipsis = "…") {
    if (cols <= 0)
        return "";
    if (displayWidth(s) <= cols)
        return s;
    const budget = cols - displayWidth(ellipsis);
    if (budget <= 0)
        return ellipsis.slice(0, cols);
    let out = "";
    let w = 0;
    const units = segmenter
        ? Array.from(segmenter.segment(stripAnsi(s)), (x) => x.segment)
        : Array.from(stripAnsi(s));
    for (const g of units) {
        const gw = graphemeWidth(g);
        if (w + gw > budget)
            break;
        out += g;
        w += gw;
    }
    return out + ellipsis;
}
