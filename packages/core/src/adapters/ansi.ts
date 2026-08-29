import type { Span } from "../spans.js";
import type { Config, TileStyle } from "../schema.js";
import type { ResolvedTile } from "../layout.js";
import { displayWidth } from "../width.js";
import { fillColorAt, type Fill } from "../fill.js";
import { EDGES, type Border } from "../rules.js";

const RESET = "\x1b[0m";

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** xterm-256 cube quantization. */
export function rgbTo256(r: number, g: number, b: number): number {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  const c = (v: number) => Math.round((v / 255) * 5);
  return 16 + 36 * c(r) + 6 * c(g) + c(b);
}

/** Nearest of the 16 base ANSI colours, by squared distance. */
const ANSI16: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0], [128, 0, 0], [0, 128, 0], [128, 128, 0],
  [0, 0, 128], [128, 0, 128], [0, 128, 128], [192, 192, 192],
  [128, 128, 128], [255, 0, 0], [0, 255, 0], [255, 255, 0],
  [0, 0, 255], [255, 0, 255], [0, 255, 255], [255, 255, 255],
];
export function rgbTo16(r: number, g: number, b: number): number {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < ANSI16.length; i++) {
    const [cr, cg, cb] = ANSI16[i]!;
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

export function resolveColor(ref: string | undefined, cfg: Config): string | undefined {
  if (!ref) return undefined;
  if (ref.startsWith("palette:")) return cfg.theme.palette[ref.slice(8)];
  return ref;
}

function sgr(hex: string, ground: "fg" | "bg", mode: Config["theme"]["colorMode"]): string {
  const [r, g, b] = hexToRgb(hex);
  if (mode === "truecolor") return `\x1b[${ground === "fg" ? 38 : 48};2;${r};${g};${b}m`;
  if (mode === "ansi256") return `\x1b[${ground === "fg" ? 38 : 48};5;${rgbTo256(r, g, b)}m`;
  const i = rgbTo16(r, g, b);
  const base = ground === "fg" ? 30 : 40;
  return i < 8 ? `\x1b[${base + i}m` : `\x1b[${base + 60 + (i - 8)}m`;
}

/**
 * Phase for an animated gradient, from wall-clock time. Ping-pongs rather than
 * wrapping, so the band travels back and forth instead of jumping at the seam.
 */
export function gradientPhase(speed: number, nowMs: number): number {
  const cycle = (nowMs / 1000) * speed;
  const t = cycle % 2;
  return t <= 1 ? t : 2 - t;
}

/** Two-stop horizontal gradient across a tile's characters. */
function gradientAt(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  const hx = (v: number) => v.toString(16).padStart(2, "0");
  return `#${hx(mix(r1, r2))}${hx(mix(g1, g2))}${hx(mix(b1, b2))}`;
}

export interface AnsiOptions {
  /** columns of padding inside each tile (pills use 1) */
  pad: number;
  /** columns between tiles */
  gap: number;
  /** wall clock for animated fills; defaults to now */
  nowMs?: number;
  /** session id, so a session-rotated palette is stable */
  seed?: string;
}

/**
 * Line borders use SGR: underline (4), overline (53), and the underline-colour
 * extension (58;2;r;g;b). Underline is universal; overline and coloured
 * underlines need a modern terminal (Kitty, WezTerm, iTerm2, Ghostty). Where
 * unsupported the sequence is ignored, so the tile degrades to no line rather
 * than to garbage. The capability matrix says which is which.
 */
function lineSgr(border: Border | undefined, cfg: Config, color: string | undefined): string {
  if (!border || border.line === "none") return "";
  let out = "";
  if (border.line === "under" || border.line === "both") out += "\x1b[4m";
  if (border.line === "over" || border.line === "both") out += "\x1b[53m";
  const c = resolveColor(color ?? border.color, cfg);
  if (c) {
    const [r, g, b] = hexToRgb(c);
    out += `\x1b[58;2;${r};${g};${b}m`;
  }
  return out;
}
const LINE_OFF = "\x1b[24m\x1b[55m\x1b[59m";

export function renderTileAnsi(rt: ResolvedTile, cfg: Config, opts: AnsiOptions): string {
  const mode = cfg.theme.colorMode;
  const eff = rt.effect;
  // A firing rule overrides the steady style; the blink recolours whichever
  // target it names, and only while it is in its on phase.
  const blinkBg = eff?.blinkTarget === "bg" ? eff.blinkColor : undefined;
  const blinkFg = eff?.blinkTarget === "fg" ? eff.blinkColor : undefined;
  const bg = resolveColor(blinkBg ?? eff?.bg ?? rt.style.bg, cfg);
  const fg = resolveColor(blinkFg ?? eff?.fg ?? rt.style.fg, cfg);
  const border = eff?.border ?? rt.style.border;
  const borderColor = eff?.blinkTarget === "border" ? eff.blinkColor : undefined;
  const [edgeL, edgeR] = EDGES[border?.edge ?? "none"];
  const edgeColor = resolveColor(borderColor ?? border?.color ?? rt.style.bg, cfg);
  const edgeSgr = edgeColor ? sgr(edgeColor, "fg", mode) : "";
  const line = lineSgr(border, cfg, borderColor);
  const grad = rt.style.gradient;
  const padStr = " ".repeat(opts.pad);

  const base = (bg ? sgr(bg, "bg", mode) : "") + (fg ? sgr(fg, "fg", mode) : "") + line;
  let out = (edgeL ? edgeSgr + edgeL + RESET : "") + base + padStr;

  const fill = rt.style.fill;
  if (fill && fill.kind !== "none") {
    // Painted through the shared evaluator, cell by cell, exactly as the web
    // preview does. One implementation, so the two cannot disagree.
    const nowMs = opts.nowMs ?? Date.now();
    const total = rt.spans.reduce((n, s) => n + [...s.text].length, 0) + opts.pad * 2;
    let i = opts.pad;
    out = "";
    for (let k = 0; k < opts.pad; k++) {
      out += sgr(fillColorAt(fill, k, 0, total, 1, nowMs, opts.seed ?? "") || "#000000", "bg", mode) + " ";
    }
    for (const s of rt.spans) {
      const fgOwn = resolveColor(s.fg, cfg);
      for (const ch of s.text) {
        const bg = fillColorAt(fill, i, 0, total, 1, nowMs, opts.seed ?? "");
        out += (bg ? sgr(bg, "bg", mode) : "")
             + (fgOwn ? sgr(fgOwn, "fg", mode) : fg ? sgr(fg, "fg", mode) : "")
             + (s.bold ? "\x1b[1m" : "") + (s.dim ? "\x1b[2m" : "")
             + (s.link ? osc8(s.link, ch) : ch);
        i++;
      }
    }
    for (let k = 0; k < opts.pad; k++) {
      out += sgr(fillColorAt(fill, i + k, 0, total, 1, nowMs, opts.seed ?? "") || "#000000", "bg", mode) + " ";
    }
    return (edgeL ? edgeSgr + edgeL + RESET : "") + line + out + LINE_OFF + RESET
         + (edgeR ? edgeSgr + edgeR + RESET : "");
  }
  if (grad) {
    const from = resolveColor(grad.from, cfg)!;
    const to = resolveColor(grad.to, cfg)!;
    const total = rt.spans.reduce((n, s) => n + [...s.text].length, 0);
    const phase = grad.animated ? gradientPhase(grad.speed, opts.nowMs ?? Date.now()) : 0;
    let i = 0;
    for (const s of rt.spans) {
      for (const ch of s.text) {
        const base = total > 1 ? i / (total - 1) : 0;
        const t = grad.animated ? Math.abs(((base + phase) % 2) - 1) : base;
        out += sgr(gradientAt(from, to, t), "fg", mode) + ch;
        i++;
      }
    }
  } else {
    for (const s of rt.spans) out += spanAnsi(s, cfg, base);
  }
  return out + base + padStr + LINE_OFF + RESET + (edgeR ? edgeSgr + edgeR + RESET : "");
}

function spanAnsi(s: Span, cfg: Config, base: string): string {
  const mode = cfg.theme.colorMode;
  let pre = "";
  const fg = resolveColor(s.fg, cfg);
  if (fg) pre += sgr(fg, "fg", mode);
  const bg = resolveColor(s.bg, cfg);
  if (bg) pre += sgr(bg, "bg", mode);
  if (s.bold) pre += "\x1b[1m";
  if (s.dim) pre += "\x1b[2m";
  const body = s.link ? osc8(s.link, s.text) : s.text;
  // Return to the tile's own colours rather than a bare reset, so the pill
  // background survives an inner colour change.
  return pre ? pre + body + RESET + base : body;
}

export function osc8(url: string, text: string): string {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

export function renderRowAnsi(kept: ResolvedTile[], cfg: Config, opts: AnsiOptions,
                              rowIndex = 0, rowCount = 1): string {
  const line = kept.map((t) => renderTileAnsi(t, cfg, opts)).join(" ".repeat(opts.gap));
  const fill = cfg.theme.terminalFill;
  if (!fill || fill.kind === "none") return line;
  return paintFill(line, fill, cfg, opts, rowIndex, rowCount);
}

/**
 * Paint a fill behind a row.
 *
 * The terminal has no layer to put a gradient on, so the field is written as a
 * background colour on every cell that does not already carry a tile's own
 * background. Walking the emitted string honours the SGR state we just wrote
 * rather than guessing at it.
 *
 * `rowIndex` and `rowCount` are passed through so a two-dimensional mode
 * (radial, spiral, plasma) actually varies down the bar instead of repeating
 * the same line.
 */
function paintFill(line: string, fill: Fill, cfg: Config, opts: AnsiOptions,
                   rowIndex: number, rowCount: number): string {
  const mode = cfg.theme.colorMode;
  const nowMs = opts.nowMs ?? Date.now();
  const cells = displayWidth(line);
  if (!cells) return line;

  let out = "";
  let col = 0;
  let hasOwnBg = false;
  let i = 0;
  const groundAt = (c: number) => {
    const hex = fillColorAt(fill, c, rowIndex, cells, Math.max(1, rowCount), nowMs, opts.seed ?? "");
    return hex ? sgr(hex, "bg", mode) : "";
  };

  while (i < line.length) {
    if (line[i] === "\x1b") {
      const m = /^\x1b\[[0-9;:]*m/.exec(line.slice(i));
      if (m) {
        const seq = m[0];
        if (/\[0m$/.test(seq)) hasOwnBg = false;
        else if (/4[0-79]|48;/.test(seq)) hasOwnBg = true;
        out += seq;
        i += seq.length;
        if (!hasOwnBg) out += groundAt(col);
        continue;
      }
      const osc = /^\x1b\]8;[^\x07\x1b]*(?:\x07|\x1b\\)/.exec(line.slice(i));
      if (osc) { out += osc[0]; i += osc[0].length; continue; }
    }
    if (col === 0 && !out) out += groundAt(0);
    out += line[i];
    col += displayWidth(line[i]!);
    i++;
  }
  return out + RESET;
}

/**
 * A standalone fill band, drawn with half-blocks so one text row carries two
 * pixel rows. This is how a baked image reaches the terminal: U+2580 sets the
 * foreground to the upper pixel and the background to the lower one.
 */
export function renderFillBand(fill: Fill, cols: number, textRows: number,
                               cfg: Config, nowMs: number, seed = ""): string[] {
  const mode = cfg.theme.colorMode;
  const pixelRows = textRows * 2;
  const lines: string[] = [];
  for (let r = 0; r < textRows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      const top = fillColorAt(fill, c, r * 2, cols, pixelRows, nowMs, seed);
      const bot = fillColorAt(fill, c, r * 2 + 1, cols, pixelRows, nowMs, seed);
      line += sgr(top || "#000000", "fg", mode) + sgr(bot || "#000000", "bg", mode) + "\u2580";
    }
    lines.push(line + RESET);
  }
  return lines;
}
