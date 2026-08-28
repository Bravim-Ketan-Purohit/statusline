import { modelTile } from "./model.js";
import { clockTile } from "./clock.js";
import { cwdTile } from "./cwd.js";
import { gitBranchTile } from "./gitBranch.js";
import { contextBarTile } from "./contextBar.js";
import { fiveHourBarTile } from "./fiveHourBar.js";
/**
 * Adding a tile = adding one file and one line here. No switch statements
 * anywhere else in the codebase touch tile types.
 */
const MODULES = [
    modelTile,
    clockTile,
    cwdTile,
    gitBranchTile,
    contextBarTile,
    fiveHourBarTile,
];
export const registry = new Map(MODULES.map((m) => [m.id, m]));
export const allTiles = () => [...registry.values()];
export const getTile = (id) => registry.get(id);
