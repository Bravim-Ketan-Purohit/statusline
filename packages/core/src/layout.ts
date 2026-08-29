import type { Config, Tile, Breakpoint, TileStyle } from "./schema.js";
import type { Span, RenderMode } from "./spans.js";
import { span } from "./spans.js";
import { displayWidth } from "./width.js";
import { getTile } from "./tiles/registry.js";
import { evaluateRules, isSuppressed, EDGES, type ResolvedEffect } from "./rules.js";
import type { RuntimeData } from "./runtime.js";

export interface ResolvedTile {
  tile: Tile;
  spans: Span[];
  width: number;
  priority: number;
  flex: boolean;
  style: TileStyle;
  /** rules resolved for this instant */
  effect: ResolvedEffect;
  /** true when the tile's data was absent and this is a builder placeholder */
  empty?: boolean;
  /** true when hideWhen / showOnlyWhen removed it from the terminal */
  suppressed?: boolean;
}

/** Pick the largest breakpoint whose minCols <= cols. */
export function resolveBreakpoint(bps: Breakpoint[], cols: number): Breakpoint {
  const sorted = [...bps].sort((a, b) => a.minCols - b.minCols);
  let chosen = sorted[0]!;
  for (const bp of sorted) if (cols >= bp.minCols) chosen = bp;
  return chosen;
}

/**
 * Sparse inheritance: walk breakpoints from smallest up to the active one,
 * merging each override in turn. A breakpoint records only what differs.
 */
export function effectiveOverride(tile: Tile, bps: Breakpoint[], activeId: string) {
  const sorted = [...bps].sort((a, b) => a.minCols - b.minCols);
  let hidden = false;
  let compact = false;
  let style: Partial<TileStyle> = {};
  for (const bp of sorted) {
    const ov = (tile.responsive as Record<string, any>)[bp.id];
    if (ov && typeof ov === "object") {
      if (typeof ov.hidden === "boolean") hidden = ov.hidden;
      if (typeof ov.compact === "boolean") compact = ov.compact;
      if (ov.style) style = { ...style, ...ov.style };
    }
    if (bp.id === activeId) break;
  }
  return { hidden, compact, style };
}

/** Decorate a tile's value spans with its glyph and dim label. */
function decorate(style: TileStyle, value: Span[], mode: RenderMode): Span[] {
  const out: Span[] = [];
  if (style.glyph) out.push(span(style.glyph + " "));
  if (style.label && mode === "full") out.push(span(style.label + " ", { dim: style.labelDim }));
  return [...out, ...value];
}

export interface BuildOptions {
  /** wall clock, so a blink resolves identically in every target */
  nowMs?: number;
  /**
   * Keep suppressed tiles, flagged. The terminal never wants this; the builder
   * always does, or a tile you just set showOnlyWhen on would vanish from the
   * canvas and become uneditable.
   */
  keepSuppressed?: boolean;
  /**
   * Keep tiles whose render produced nothing, flagged `empty`. The terminal
   * never wants this -- a missing field must not draw a box. The builder
   * always does: a tile you just dropped has to be visible to be styled.
   */
  keepEmpty?: boolean;
}

export function buildRow(
  cfg: Config,
  rowIndex: number,
  data: RuntimeData,
  cols: number,
  buildOpts: BuildOptions = {}
): ResolvedTile[] {
  const row = cfg.rows[rowIndex];
  if (!row) return [];
  const bp = resolveBreakpoint(cfg.breakpoints, cols);
  const out: ResolvedTile[] = [];

  for (const tile of row.tiles) {
    const mod = getTile(tile.type);
    if (!mod) continue; // unknown tile type -> skip, never crash the row
    const ov = effectiveOverride(tile, cfg.breakpoints, bp.id);
    if (ov.hidden) continue;
    // All conditional behaviour lives under style, alongside `rules`.
    const suppressed = isSuppressed(
      tile.style.hideWhen, tile.style.showOnlyWhen, tile.style.rules, data);
    if (suppressed && !buildOpts.keepSuppressed) continue;
    const mode: RenderMode = ov.compact ? "compact" : "full";

    let value: Span[];
    try {
      // The band renders its own style.fill, which tiles otherwise cannot see.
      const scoped = tile.style.fill
        ? { ...data, custom: { ...data.custom, "fill-band": JSON.stringify(tile.style.fill) } }
        : data;
      value = mod.render({ ...mod.defaultProps, ...tile.props }, scoped, mode);
    } catch {
      continue; // a throwing tile disappears; it never takes the row with it
    }
    const empty = value.length === 0;
    if (empty && !buildOpts.keepEmpty) continue; // missing field -> no box

    const style: TileStyle = { ...tile.style, ...ov.style };
    const effect = evaluateRules(
      style.rules, data, buildOpts.nowMs ?? (data.local.now ?? new Date()).getTime());
    const shown = empty ? [span(mod.displayName)] : value;
    const spans = decorate(style, shown, mode);
    out.push({
      tile,
      spans,
      // Edge characters occupy real columns, so they must be measured or the
      // solver will let a bordered row overflow.
      width: spans.reduce((w, s) => w + displayWidth(s.text), 0)
           + (EDGES[(effect.border ?? style.border)?.edge ?? "none"][0] ? 2 : 0),
      priority: (tile.responsive as { priority?: number }).priority ?? 5,
      flex: tile.flex,
      style,
      effect,
      empty,
      suppressed,
    });
  }
  return out;
}

export interface FitResult {
  kept: ResolvedTile[];
  dropped: ResolvedTile[];
  width: number;
  /**
   * Unused columns. A row may mark exactly one tile `flex`; that tile absorbs
   * the slack, which right-aligns everything after it. Zero when the width is
   * unknown (cols <= 0) or nothing is spare.
   */
  slack: number;
}

/**
 * Priority overflow. While the assembled row exceeds the available columns,
 * drop the highest priority NUMBER (least important) and re-measure. Never
 * wrap, never truncate mid-tile.
 *
 * `gap` is the inter-tile separator width the adapter will insert. `pad` is
 * per-tile padding the adapter adds (1 each side for pills).
 */
export function fitRow(tiles: ResolvedTile[], cols: number, gap: number, pad: number): FitResult {
  const items = [...tiles];
  const dropped: ResolvedTile[] = [];
  const measure = (list: ResolvedTile[]) =>
    list.reduce((w, t) => w + t.width + pad * 2, 0) + Math.max(0, list.length - 1) * gap;

  if (cols <= 0) return { kept: items, dropped, width: measure(items), slack: 0 };

  while (items.length && measure(items) > cols) {
    // Ties resolve to the earliest index, which keeps ordering deterministic.
    let worst = 0;
    for (let i = 1; i < items.length; i++) {
      if (items[i]!.priority > items[worst]!.priority) worst = i;
    }
    dropped.push(items.splice(worst, 1)[0]!);
  }
  const width = measure(items);
  // Slack only means anything when a tile is there to absorb it.
  const slack = items.some((t) => t.flex) ? Math.max(0, cols - width) : 0;
  return { kept: items, dropped, width, slack };
}
