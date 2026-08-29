import type { Config } from "../schema.js";
import type { RuntimeData } from "../runtime.js";
import type { Span } from "../spans.js";
import { buildRow, fitRow, resolveBreakpoint, type ResolvedTile } from "../layout.js";
import { resolveColor, hexToRgb, rgbTo256, rgbTo16 } from "./ansi.js";
import type { Fill } from "../fill.js";
import type { Border, ResolvedEffect } from "../rules.js";

/**
 * The web preview must not be a CSS approximation. It runs the SAME layout
 * solver, the same width math, and the same drop decisions as the ANSI
 * adapter -- this module only translates the result into values React can
 * paint. Dropped tiles are returned too, so the sheet can draw them as ghost
 * cells rather than letting them silently vanish.
 */

export interface WebSpan {
  text: string;
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  link?: string;
}

export interface WebTile {
  tileId: string;
  type: string;
  rowIndex: number;
  spans: WebSpan[];
  width: number;
  priority: number;
  bg?: string;
  fg?: string;
  gradient?: { from: string; to: string; animated: boolean; speed: number } | null;
  fill?: Fill;
  flex: boolean;
  border?: Border;
  borderColor?: string;
  effect?: ResolvedEffect;
  /** true when the layout solver dropped it at this width */
  ghost: boolean;
  /** true when the tile has no data and this is a builder placeholder */
  empty: boolean;
}

export interface WebRow {
  rowId: string;
  tiles: WebTile[];
  /** total columns the kept tiles occupy, including padding and gaps */
  width: number;
  /** columns the flex tile absorbs, so the preview aligns like the terminal */
  slack: number;
}

export interface WebRender {
  rows: WebRow[];
  breakpointId: string;
  columns: number;
  /** padding/gap the active style contributes, so the sheet can dimension it */
  pad: number;
  gap: number;
}

const STYLE_OPTS: Record<string, { pad: number; gap: number }> = {
  pills: { pad: 1, gap: 1 },
  powerline: { pad: 1, gap: 0 },
  plain: { pad: 0, gap: 3 },
};

/**
 * Quantize a colour the way the terminal will, so switching colorMode shows
 * the real downgrade instead of the truecolour version.
 */
export function quantize(hex: string, mode: Config["theme"]["colorMode"]): string {
  if (mode === "truecolor") return hex;
  const [r, g, b] = hexToRgb(hex);
  if (mode === "ansi256") {
    const i = rgbTo256(r, g, b);
    if (i >= 232) { const v = (i - 232) * 10 + 8; return rgb(v, v, v); }
    if (i >= 16) {
      const n = i - 16;
      const lv = [0, 95, 135, 175, 215, 255];
      return rgb(lv[Math.floor(n / 36)]!, lv[Math.floor((n % 36) / 6)]!, lv[n % 6]!);
    }
    return ANSI16_HEX[i]!;
  }
  return ANSI16_HEX[rgbTo16(r, g, b)]!;
}

const rgb = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

const ANSI16_HEX = [
  "#000000", "#800000", "#008000", "#808000", "#000080", "#800080", "#008080", "#c0c0c0",
  "#808080", "#ff0000", "#00ff00", "#ffff00", "#0000ff", "#ff00ff", "#00ffff", "#ffffff",
];

function toWebSpan(s: Span, cfg: Config): WebSpan {
  const mode = cfg.theme.colorMode;
  const fg = s.danger
    ? resolveColor(cfg.theme.dangerColor, cfg)
    : resolveColor(s.fg, cfg);
  const bg = resolveColor(s.bg, cfg);
  return {
    text: s.text,
    fg: fg ? quantize(fg, mode) : undefined,
    bg: bg ? quantize(bg, mode) : undefined,
    bold: s.bold || s.danger,
    dim: s.dim,
    link: s.link,
  };
}

function toWebTile(rt: ResolvedTile, cfg: Config, ghost: boolean, rowIndex: number): WebTile {
  const mode = cfg.theme.colorMode;
  const e = rt.effect;
  const bg = resolveColor(
    (e?.blinkTarget === "bg" ? e.blinkColor : undefined) ?? e?.bg ?? rt.style.bg, cfg);
  const fg = resolveColor(
    (e?.blinkTarget === "fg" ? e.blinkColor : undefined) ?? e?.fg ?? rt.style.fg, cfg);
  const g = rt.style.gradient;
  return {
    tileId: rt.tile.id,
    type: rt.tile.type,
    rowIndex,
    spans: rt.spans.map((s) => toWebSpan(s, cfg)),
    width: rt.width,
    priority: rt.priority,
    bg: bg ? quantize(bg, mode) : undefined,
    fg: fg ? quantize(fg, mode) : undefined,
    gradient: g
      ? {
          from: quantize(resolveColor(g.from, cfg) ?? "#000000", mode),
          to: quantize(resolveColor(g.to, cfg) ?? "#000000", mode),
          animated: g.animated,
          speed: g.speed,
        }
      : null,
    fill: rt.style.fill,
    flex: rt.flex,
    border: rt.effect?.border ?? rt.style.border,
    borderColor: (() => {
      const c = rt.effect?.blinkTarget === "border" ? rt.effect.blinkColor : undefined;
      const r = resolveColor(c ?? (rt.effect?.border ?? rt.style.border)?.color ?? rt.style.bg, cfg);
      return r ? quantize(r, mode) : undefined;
    })(),
    effect: rt.effect,
    ghost,
    empty: rt.empty ?? false,
  };
}

export function renderWeb(cfg: Config, data: RuntimeData): WebRender {
  const opts = STYLE_OPTS[cfg.targets.claudeCode.style] ?? STYLE_OPTS.pills!;
  const bp = resolveBreakpoint(cfg.breakpoints, data.columns);
  const rows: WebRow[] = [];

  for (let i = 0; i < cfg.rows.length; i++) {
    // keepEmpty: the canvas must show a tile even before it has data.
    const built = buildRow(cfg, i, data, data.columns,
      { keepEmpty: true, nowMs: (data.local.now ?? new Date()).getTime() });
    const { kept, dropped, width, slack } = fitRow(built, data.columns, opts.gap, opts.pad);
    // Preserve authored order, marking dropped tiles as ghosts in place.
    const keptIds = new Set(kept.map((t) => t.tile.id));
    const tiles = built.map((t) => toWebTile(t, cfg, !keptIds.has(t.tile.id), i));
    if (!tiles.length && !dropped.length) continue;
    rows.push({ rowId: cfg.rows[i]!.id, tiles, width, slack });
  }
  return { rows, breakpointId: bp.id, columns: data.columns, pad: opts.pad, gap: opts.gap };
}
