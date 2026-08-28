import type { TileModule } from "./types.js";
import { modelTile } from "./model.js";
import { clockTile } from "./clock.js";
import { cwdTile } from "./cwd.js";
import { gitBranchTile } from "./gitBranch.js";
import { contextBarTile } from "./contextBar.js";
import { fiveHourBarTile } from "./fiveHourBar.js";
import {
  effortTile, sessionNameTile, durationTile, costTile, contextPctTile,
  sevenDayTile, linesChangedTile, ccVersionTile, vimModeTile, agentTile,
} from "./session.js";
import {
  gitCountsTile, gitAheadBehindTile, gitLastCommitTile, gitStashTile, gitShaTile,
  gitDiffTile, worktreeTile, repoSlugTile, prTile, ciTile, ghPrCountsTile, ghIssuesTile,
} from "./git.js";
import { venvTile, nodeVersionTile, pythonVersionTile, hostnameTile, batteryTile } from "./env.js";
import { verseTile, trackTile, skillsTile } from "./personal.js";
import { playPauseTile, nextTile, prevTile, volUpTile, volDownTile, nowPlayingTile } from "./media.js";
import { textTile, spacerTile, separatorTile, commandTile } from "./layout.js";

/**
 * Adding a tile = adding one file and one line here. Nothing else in the
 * codebase switches on a tile type.
 */
const MODULES: TileModule<any>[] = [
  // session
  modelTile, effortTile, sessionNameTile, durationTile, costTile,
  contextBarTile, contextPctTile, fiveHourBarTile, sevenDayTile,
  linesChangedTile, ccVersionTile, vimModeTile, agentTile,
  // git
  gitBranchTile, gitCountsTile, gitAheadBehindTile, gitLastCommitTile,
  gitStashTile, gitShaTile, gitDiffTile, worktreeTile, repoSlugTile,
  prTile, ciTile, ghPrCountsTile, ghIssuesTile,
  // environment
  clockTile, cwdTile, venvTile, nodeVersionTile, pythonVersionTile,
  hostnameTile, batteryTile,
  // personal
  verseTile, trackTile, skillsTile,
  // media
  nowPlayingTile, playPauseTile, prevTile, nextTile, volUpTile, volDownTile,
  // layout
  textTile, spacerTile, separatorTile, commandTile,
];

export const registry = new Map<string, TileModule<any>>(MODULES.map((m) => [m.id, m]));
export const allTiles = () => [...registry.values()];
export const getTile = (id: string) => registry.get(id);
export type { TileModule, Capability } from "./types.js";
