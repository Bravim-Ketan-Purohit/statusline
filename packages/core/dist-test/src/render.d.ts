import type { Config } from "./schema.js";
import type { RuntimeData } from "./runtime.js";
/**
 * The one entry point every target shares. Returns finished lines.
 * A throwing tile is already contained in buildRow; this wrapper is the last
 * line of defence -- the CLI adds a model-name fallback on top.
 */
export declare function renderAnsi(cfg: Config, data: RuntimeData): string[];
