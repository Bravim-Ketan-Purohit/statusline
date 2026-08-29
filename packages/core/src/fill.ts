/**
 * Fill evaluation.
 *
 * A status line is a grid of cells, each with a 24-bit background. That is a
 * framebuffer -- a very small one, but a real one. Everything here answers a
 * single question for every target: what colour is the cell at (x, y) at time
 * t? The ANSI adapter, the tmux adapter and the web preview all call this, so
 * a fill cannot look different between the builder and the terminal.
 *
 * No image decoding lives here. The builder decodes a PNG or GIF with canvas
 * and bakes the result into the config as stops or a small cell matrix, so the
 * CLI stays dependency-free and never parses a raster on the render path.
 */

export interface FillStop {
  color: string;   // #rrggbb
  pos: number;     // 0..1
}

export type FillMode =
  | "linear" | "radial" | "conic" | "diamond"
  | "wave" | "ripple" | "spiral" | "barber"
  | "comet" | "scan" | "plasma" | "pulse"
  | "breathe" | "rainbow" | "strobe";

export const FILL_MODES: { id: FillMode; name: string; note: string }[] = [
  { id: "linear",  name: "Linear",   note: "A straight ramp at any angle." },
  { id: "radial",  name: "Radial",   note: "Out from an origin you can move." },
  { id: "conic",   name: "Conic",    note: "Swept around the origin like a radar." },
  { id: "diamond", name: "Diamond",  note: "Manhattan distance; hard rhombic bands." },
  { id: "wave",    name: "Wave",     note: "A ramp bent by a sine along the rows." },
  { id: "ripple",  name: "Ripple",   note: "Concentric rings travelling outward." },
  { id: "spiral",  name: "Spiral",   note: "Conic and radial combined; it winds." },
  { id: "barber",  name: "Barber",   note: "Repeating diagonal stripes that climb." },
  { id: "comet",   name: "Comet",    note: "One bright head with a trailing falloff." },
  { id: "scan",    name: "Scan",     note: "A single band sweeping edge to edge." },
  { id: "plasma",  name: "Plasma",   note: "Summed sines; the classic demoscene field." },
  { id: "pulse",   name: "Pulse",    note: "The whole bar moves through the ramp at once." },
  { id: "breathe", name: "Breathe",  note: "Like pulse but eased, so it swells." },
  { id: "rainbow", name: "Rainbow",  note: "Ignores the stops and rotates hue." },
  { id: "strobe",  name: "Strobe",   note: "Snaps between stops with no blend." },
];

export interface CellMatrix { w: number; h: number; data: string[] }

export interface Fill {
  kind: "none" | "gradient" | "image";
  stops: FillStop[];
  mode: FillMode;
  /** degrees, 0 = left-to-right */
  angle: number;
  /** 0..1 within the field */
  origin: [number, number];
  animated: boolean;
  /** cycles per second */
  speed: number;
  /** how many times the ramp repeats across the field */
  scale: number;
  /** image kind: a low-res colour matrix, sampled bilinearly */
  cells?: CellMatrix;
  /** several baked palettes to rotate between, no network at render time */
  rotate?: { palettes: FillStop[][]; every: "session" | "hourly" | "daily" };
}

export const DEFAULT_FILL: Fill = {
  kind: "none",
  stops: [{ color: "#2b0b52", pos: 0 }, { color: "#7b2ff7", pos: 1 }],
  mode: "linear", angle: 0, origin: [0.5, 0.5],
  animated: false, speed: 0.25, scale: 1,
};

// --- colour helpers --------------------------------------------------------

const hex2rgb = (h: string): [number, number, number] => {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const rgb2hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

export function hsl2hex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return rgb2hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Sample a multi-stop ramp at t in 0..1. */
export function sampleStops(stops: FillStop[], t: number): string {
  if (!stops.length) return "#000000";
  if (stops.length === 1) return stops[0]!.color;
  const s = [...stops].sort((a, b) => a.pos - b.pos);
  const u = Math.max(0, Math.min(1, t));
  if (u <= s[0]!.pos) return s[0]!.color;
  if (u >= s[s.length - 1]!.pos) return s[s.length - 1]!.color;
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i]!, b = s[i + 1]!;
    if (u >= a.pos && u <= b.pos) {
      const span = b.pos - a.pos;
      const k = span <= 0 ? 0 : (u - a.pos) / span;
      const [r1, g1, b1] = hex2rgb(a.color), [r2, g2, b2] = hex2rgb(b.color);
      return rgb2hex(r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k);
    }
  }
  return s[s.length - 1]!.color;
}

/** Bilinear sample of a baked image matrix. */
export function sampleCells(m: CellMatrix, u: number, v: number): string {
  const x = Math.max(0, Math.min(m.w - 1, u * (m.w - 1)));
  const y = Math.max(0, Math.min(m.h - 1, v * (m.h - 1)));
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(m.w - 1, x0 + 1), y1 = Math.min(m.h - 1, y0 + 1);
  const fx = x - x0, fy = y - y0;
  const at = (px: number, py: number) => hex2rgb(m.data[py * m.w + px] ?? "#000000");
  const [r00, g00, b00] = at(x0, y0), [r10, g10, b10] = at(x1, y0);
  const [r01, g01, b01] = at(x0, y1), [r11, g11, b11] = at(x1, y1);
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  return rgb2hex(
    lerp(lerp(r00, r10, fx), lerp(r01, r11, fx), fy),
    lerp(lerp(g00, g10, fx), lerp(g01, g11, fx), fy),
    lerp(lerp(b00, b10, fx), lerp(b01, b11, fx), fy),
  );
}

const TAU = Math.PI * 2;
/** Ping-pong into 0..1 so a travelling ramp never snaps at the seam. */
const pingpong = (t: number) => { const m = ((t % 2) + 2) % 2; return m <= 1 ? m : 2 - m; };
const wrap = (t: number) => ((t % 1) + 1) % 1;

/**
 * Scalar field for a mode. Returns t in 0..1, before ramp sampling.
 * u, v are normalized cell coordinates; p is the animation phase in cycles.
 */
export function fieldAt(fill: Fill, u: number, v: number, p: number): number {
  const [ox, oy] = fill.origin;
  const k = Math.max(0.05, fill.scale);
  const rad = (fill.angle * Math.PI) / 180;
  const dx = u - ox, dy = v - oy;
  // Normalised so a corner is ~1: the half-diagonal of the unit square is 1/sqrt(2).
  const dist = Math.hypot(dx, dy) * Math.SQRT2;
  const ang = (Math.atan2(dy, dx) / TAU + 0.5);

  switch (fill.mode) {
    case "linear":  return pingpong((u * Math.cos(rad) + v * Math.sin(rad)) * k + p);
    case "radial":  return pingpong(dist * k + p);
    case "conic":   return wrap(ang * k + p);
    case "diamond": return pingpong((Math.abs(dx) + Math.abs(dy)) * k + p);
    case "wave":    return pingpong(u * k + 0.18 * Math.sin(TAU * (v * 2 + p)) + p);
    case "ripple":  return 0.5 + 0.5 * Math.sin(TAU * (dist * k * 3 - p * 2));
    case "spiral":  return wrap(ang * k + dist * k * 2 + p);
    case "barber":  return wrap((u + v) * k * 2 + p);
    case "comet": {
      const head = wrap(p);
      const d = Math.abs(wrap(u - head + 0.5) - 0.5) * 2;   // 0 at head, 1 opposite
      return Math.pow(1 - d, 3 * k);
    }
    case "scan": {
      const band = wrap(p);
      const d = Math.abs(u - band);
      return Math.max(0, 1 - d * 8 / k);
    }
    case "plasma": {
      const s = Math.sin(TAU * (u * k + p))
              + Math.sin(TAU * (v * k * 1.7 - p * 0.8))
              + Math.sin(TAU * ((u + v) * k * 0.6 + p * 1.3));
      return (s / 3 + 1) / 2;
    }
    case "pulse":   return pingpong(p * 2);
    case "breathe": return 0.5 + 0.5 * Math.sin(TAU * p);
    case "rainbow": return wrap(u * k + p);
    case "strobe":  return Math.floor(wrap(p) * 2) % 2;
    default:        return pingpong(u * k + p);
  }
}

/** The colour of one cell. This is the single source of truth for every target. */
export function fillColorAt(
  fill: Fill, x: number, y: number, w: number, h: number, nowMs: number,
  seed = "",
): string {
  if (fill.kind === "none") return "";
  const u = w > 1 ? x / (w - 1) : 0;
  const v = h > 1 ? y / (h - 1) : 0;

  if (fill.kind === "image" && fill.cells) {
    if (!fill.animated) return sampleCells(fill.cells, u, v);
    // An animated image pans rather than blending: the matrix scrolls.
    const p = (nowMs / 1000) * fill.speed;
    return sampleCells(fill.cells, wrap(u + p), v);
  }

  const stops = pickPalette(fill, nowMs, seed);
  const p = fill.animated ? (nowMs / 1000) * fill.speed : 0;
  const t = fieldAt(fill, u, v, p);
  if (fill.mode === "rainbow") return hsl2hex(t * 360, 0.72, 0.55);
  return sampleStops(stops, t);
}

/**
 * Rotating wallpapers, without a network call on the render path: the builder
 * bakes several palettes into the config and the clock picks between them.
 */
export function pickPalette(fill: Fill, nowMs: number, seed: string): FillStop[] {
  const r = fill.rotate;
  if (!r?.palettes?.length) return fill.stops;
  const bucket =
    r.every === "hourly" ? Math.floor(nowMs / 3_600_000)
    : r.every === "daily" ? Math.floor(nowMs / 86_400_000)
    : [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return r.palettes[Math.abs(bucket) % r.palettes.length] ?? fill.stops;
}
