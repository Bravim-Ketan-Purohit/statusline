import type { TileModule } from "./types.js";
/**
 * Tier 1: the CLI parses .git/HEAD directly (no subprocess), so this tile just
 * formats what it was handed. Detached HEAD arrives pre-shortened.
 */
export declare const gitBranchTile: TileModule<Record<string, never>>;
