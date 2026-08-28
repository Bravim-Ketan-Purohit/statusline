import type { TileModule } from "./types.js";
/** Tier 1: zoneinfo only, no subprocess. */
export declare const clockTile: TileModule<{
    tz: string;
    hour12: boolean;
    showZone: boolean;
}>;
