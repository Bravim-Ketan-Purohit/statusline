import type { TileModule } from "./types.js";
export declare function barColor(pct: number): string;
export declare function renderBar(pct: number, width: number): {
    filled: string;
    empty: string;
};
export declare const contextBarTile: TileModule<{
    width: number;
    showTokens: boolean;
    warnAt: number;
}>;
