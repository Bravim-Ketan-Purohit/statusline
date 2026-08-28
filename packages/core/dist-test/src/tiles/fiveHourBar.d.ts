import type { TileModule } from "./types.js";
export declare function humanDelta(seconds: number): string;
/**
 * Projects when the 5h cap would be hit at the current burn rate. Suppressed
 * while the numbers are too early or too noisy to carry information.
 */
export declare function projectCap(usedPct: number, resetsAt: number, nowSec: number, opts?: {
    minElapsed: number;
    minPct: number;
    maxEta: number;
}): {
    resetsIn: string;
    capEta: string | null;
} | null;
export declare const fiveHourBarTile: TileModule<{
    width: number;
    showReset: boolean;
    showProjection: boolean;
}>;
