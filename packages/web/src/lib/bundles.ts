import type { Config, Tile } from "@statusline/core";

/**
 * Named starting points. Safety is appended to every other bundle by default,
 * because those tiles prevent accidents and cost four characters each.
 */
export interface Bundle {
  id: string;
  name: string;
  note: string;
  tiles: string[];
}

export const SAFETY_TILES = ["git-branch"];

export const BUNDLES: Bundle[] = [
  { id: "minimal", name: "Minimal", note: "Model, context, branch.", tiles: ["model", "context-bar", "git-branch"] },
  { id: "session", name: "Session", note: "Everything the stdin JSON gives free.", tiles: ["model", "context-bar", "five-hour-bar", "cwd", "clock"] },
  { id: "fullstack", name: "Full-stack dev", note: "Git and context, room for CI.", tiles: ["git-branch", "cwd", "context-bar", "model"] },
  { id: "war-room", name: "War room", note: "Burn, cost, and what changed.", tiles: ["model", "context-bar", "five-hour-bar", "git-branch", "clock"] },
  { id: "focus", name: "Focus", note: "Clock and context, nothing else.", tiles: ["clock", "context-bar"] },
];

let seq = 0;
const uid = (type: string) => `t-${type}-${Date.now().toString(36)}-${seq++}`;

export function makeTile(type: string, priority = 5): Tile {
  return {
    id: uid(type),
    type,
    props: {},
    style: { gradient: null, glyph: "", label: "", labelDim: true },
    action: null,
    flex: false,
    responsive: { priority, sm: { compact: true }, md: { compact: false } },
  } as Tile;
}

export function applyBundle(cfg: Config, bundle: Bundle, withSafety: boolean): Config {
  const wanted = withSafety
    ? [...bundle.tiles, ...SAFETY_TILES.filter((t) => !bundle.tiles.includes(t))]
    : bundle.tiles;
  const rows = [
    { id: "row-1", tiles: wanted.slice(0, 3).map((t, i) => makeTile(t, i + 1)) },
    { id: "row-2", tiles: wanted.slice(3).map((t, i) => makeTile(t, i + 1)) },
  ].filter((r) => r.tiles.length);
  return { ...cfg, rows: rows.length ? rows : [{ id: "row-1", tiles: [] }] };
}
