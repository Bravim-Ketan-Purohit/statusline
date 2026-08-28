import type { Config, Tile, Breakpoint, TileStyle } from "./schema.js";
import type { Span } from "./spans.js";
import type { RuntimeData } from "./runtime.js";
export interface ResolvedTile {
    tile: Tile;
    spans: Span[];
    width: number;
    priority: number;
    flex: boolean;
    style: TileStyle;
}
/** Pick the largest breakpoint whose minCols <= cols. */
export declare function resolveBreakpoint(bps: Breakpoint[], cols: number): Breakpoint;
/**
 * Sparse inheritance: walk breakpoints from smallest up to the active one,
 * merging each override in turn. A breakpoint records only what differs.
 */
export declare function effectiveOverride(tile: Tile, bps: Breakpoint[], activeId: string): {
    hidden: boolean;
    compact: boolean;
    style: Partial<{
        gradient: {
            from: string;
            to: string;
        } | null;
        glyph: string;
        label: string;
        labelDim: boolean;
        bg?: string | undefined;
        fg?: string | undefined;
    }>;
};
export declare function buildRow(cfg: Config, rowIndex: number, data: RuntimeData, cols: number): ResolvedTile[];
export interface FitResult {
    kept: ResolvedTile[];
    dropped: ResolvedTile[];
    width: number;
}
/**
 * Priority overflow. While the assembled row exceeds the available columns,
 * drop the highest priority NUMBER (least important) and re-measure. Never
 * wrap, never truncate mid-tile.
 *
 * `gap` is the inter-tile separator width the adapter will insert. `pad` is
 * per-tile padding the adapter adds (1 each side for pills).
 */
export declare function fitRow(tiles: ResolvedTile[], cols: number, gap: number, pad: number): FitResult;
