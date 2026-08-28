import type { Config } from "../schema.js";
import type { ResolvedTile } from "../layout.js";
export declare function hexToRgb(hex: string): [number, number, number];
/** xterm-256 cube quantization. */
export declare function rgbTo256(r: number, g: number, b: number): number;
export declare function rgbTo16(r: number, g: number, b: number): number;
export declare function resolveColor(ref: string | undefined, cfg: Config): string | undefined;
export interface AnsiOptions {
    /** columns of padding inside each tile (pills use 1) */
    pad: number;
    /** columns between tiles */
    gap: number;
}
export declare function renderTileAnsi(rt: ResolvedTile, cfg: Config, opts: AnsiOptions): string;
export declare function osc8(url: string, text: string): string;
export declare function renderRowAnsi(kept: ResolvedTile[], cfg: Config, opts: AnsiOptions): string;
