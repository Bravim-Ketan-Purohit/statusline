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
export declare function stripAnsi(s: string): string;
/**
 * Width of a single grapheme cluster. Splitting on graphemes first is what
 * makes combining marks and ZWJ emoji sequences fall out correctly: "👨‍👩‍👧"
 * is one cluster of width 2, not three emoji of width 6.
 */
export declare function graphemeWidth(g: string): number;
/** Display width in terminal columns, with ANSI/OSC 8 stripped first. */
export declare function displayWidth(s: string): number;
/** Truncate to `cols` display columns, appending `ellipsis` if it had to cut. */
export declare function truncateToWidth(s: string, cols: number, ellipsis?: string): string;
