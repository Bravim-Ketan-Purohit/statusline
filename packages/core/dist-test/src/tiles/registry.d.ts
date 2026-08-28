import type { TileModule } from "./types.js";
export declare const registry: Map<string, TileModule<any>>;
export declare const allTiles: () => TileModule<any>[];
export declare const getTile: (id: string) => TileModule<any> | undefined;
export type { TileModule, Capability } from "./types.js";
