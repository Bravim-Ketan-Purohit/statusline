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
import { kubeContextTile, awsProfileTile, gcpProjectTile, protectedBranchTile } from "./safety.js";
import { cpuTile, memoryTile, swapTile, diskTile, loadTile, networkTile, gpuTile, vramTile } from "./system.js";
import {
  linearAssignedTile, linearStartedTile, linearReviewTile, linearTriageTile,
  sentryIssuesTile, sentryEventsTile,
  deployStatusTile, deployDurationTile, deployUrlTile,
} from "./integrations.js";
import { verseTile, trackTile, skillsTile } from "./personal.js";
import { playPauseTile, nextTile, prevTile, volUpTile, volDownTile, nowPlayingTile } from "./media.js";
import { textTile, spacerTile, separatorTile, commandTile } from "./layout.js";
import { bandTile } from "./band.js";

/**
 * Adding a tile = adding one file and one line here. Nothing else in the
 * codebase switches on a tile type.
 */
const MODULES: TileModule<any>[] = [
  // session
  modelTile, effortTile, sessionNameTile, durationTile, costTile,
  contextBarTile, contextPctTile, fiveHourBarTile, sevenDayTile,
  linesChangedTile, ccVersionTile, vimModeTile, agentTile,
  // network-backed
  linearAssignedTile, linearStartedTile, linearReviewTile, linearTriageTile,
  sentryIssuesTile, sentryEventsTile,
  deployStatusTile, deployDurationTile, deployUrlTile,
  // git
  gitBranchTile, gitCountsTile, gitAheadBehindTile, gitLastCommitTile,
  gitStashTile, gitShaTile, gitDiffTile, worktreeTile, repoSlugTile,
  prTile, ciTile, ghPrCountsTile, ghIssuesTile,
  // environment
  clockTile, cwdTile, venvTile, nodeVersionTile, pythonVersionTile,
  hostnameTile, batteryTile,
  // safety — these prevent rather than inform
  kubeContextTile, awsProfileTile, gcpProjectTile, protectedBranchTile,
  // tier 3 — sampled by the daemon, never read on the render path
  cpuTile, memoryTile, swapTile, diskTile, loadTile, networkTile, gpuTile, vramTile,
  // personal
  verseTile, trackTile, skillsTile,
  // media
  nowPlayingTile, playPauseTile, prevTile, nextTile, volUpTile, volDownTile,
  // layout
  textTile, spacerTile, separatorTile, commandTile, bandTile,
];

/**
 * Mutable on purpose: declarative widgets register themselves at load time.
 * A manifest may never replace a built-in, which the loader enforces.
 */
export const registry = new Map<string, TileModule<any>>(MODULES.map((m) => [m.id, m]));

/**
 * The built-in ids, captured before any manifest registers.
 *
 * A collision check against `registry` itself is wrong: once a manifest has
 * registered, it collides with its own entry, and every later load rejects it.
 * That failed only in the bundled binary, where load and refresh share a
 * process.
 */
export const BUILTIN_IDS: ReadonlySet<string> = new Set(MODULES.map((m) => m.id));
export const allTiles = () => [...registry.values()];
export const getTile = (id: string) => registry.get(id);
export type { TileModule, Capability } from "./types.js";
