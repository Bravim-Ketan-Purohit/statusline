import type { Config } from "@statusline/core";

/**
 * Preset themes. Each names the terminal ground it expects, because a palette
 * built for a dark terminal reads wrong on a light one and vice versa.
 */
export interface Preset {
  id: string;
  name: string;
  note: string;
  terminalBg: string;
  colorMode: Config["theme"]["colorMode"];
  palette: Record<string, string>;
  /** tile-type -> {bg, fg} */
  pens: Record<string, { bg: string; fg: string }>;
}

const P = (bg: string, fg: string) => ({ bg, fg });

export const PRESETS: Preset[] = [
  {
    id: "drafting", name: "Drafting", note: "The sheet's own pens, on a near-black ground.",
    terminalBg: "#16181c", colorMode: "truecolor",
    palette: { accent: "#c2452d", muted: "#6f6a5c" },
    pens: {
      clock: P("#005f87", "#d7ffff"), model: P("#5f00af", "#e4b8ff"),
      cwd: P("#005faf", "#d7ffff"), "git-branch": P("#005f00", "#d7ffd7"),
      "context-bar": P("#00005f", "#afd7ff"), "five-hour-bar": P("#5f0000", "#ffd7d7"),
      pr: P("#875f00", "#ffd7af"), ci: P("#005f5f", "#afffff"),
    },
  },
  {
    id: "blueprint", name: "Blueprint", note: "Cyanotype: one field, white linework.",
    terminalBg: "#0d2137", colorMode: "truecolor",
    palette: { accent: "#7fb2d9", muted: "#4a7fa5" },
    pens: {
      clock: P("#14395c", "#cfe6f7"), model: P("#1b4a75", "#e8f4ff"),
      cwd: P("#14395c", "#cfe6f7"), "git-branch": P("#1b4a75", "#cfe6f7"),
      "context-bar": P("#0f2c48", "#9fcbe8"), "five-hour-bar": P("#0f2c48", "#9fcbe8"),
      pr: P("#1b4a75", "#e8f4ff"), ci: P("#14395c", "#cfe6f7"),
    },
  },
  {
    id: "silkscreen", name: "Silkscreen", note: "PCB legend: green mask, white text, gold pads.",
    terminalBg: "#0b1a12", colorMode: "truecolor",
    palette: { accent: "#d4a017", muted: "#4e7a5c" },
    pens: {
      clock: P("#143d26", "#e6f2ea"), model: P("#1a5233", "#ffffff"),
      cwd: P("#143d26", "#e6f2ea"), "git-branch": P("#1a5233", "#e6f2ea"),
      "context-bar": P("#0f2e1c", "#a8d5b8"), "five-hour-bar": P("#4a3a08", "#f0d98a"),
      pr: P("#4a3a08", "#f0d98a"), ci: P("#1a5233", "#e6f2ea"),
    },
  },
  {
    id: "plain", name: "Plain ink", note: "No fills. Colour lives in the text only.",
    terminalBg: "#16181c", colorMode: "truecolor",
    palette: { accent: "#d78700", muted: "#6c6f85" },
    pens: {},
  },
  {
    id: "ansi16", name: "16 colour", note: "For a terminal with no truecolour.",
    terminalBg: "#000000", colorMode: "ansi16",
    palette: { accent: "#00ffff", muted: "#808080" },
    pens: {
      clock: P("#008080", "#ffffff"), model: P("#800080", "#ffffff"),
      cwd: P("#000080", "#ffffff"), "git-branch": P("#008000", "#ffffff"),
      "context-bar": P("#000080", "#00ffff"), "five-hour-bar": P("#800000", "#ffffff"),
      pr: P("#808000", "#ffffff"), ci: P("#008000", "#ffffff"),
    },
  },
];

export function applyPreset(cfg: Config, p: Preset): Config {
  return {
    ...cfg,
    theme: { ...cfg.theme, terminalBg: p.terminalBg, colorMode: p.colorMode, palette: p.palette },
    rows: cfg.rows.map((r) => ({
      ...r,
      tiles: r.tiles.map((t) => {
        const pen = p.pens[t.type];
        return {
          ...t,
          style: pen
            ? { ...t.style, bg: pen.bg, fg: pen.fg, gradient: null }
            // "Plain ink" clears fills rather than inventing one per tile.
            : { ...t.style, bg: undefined, fg: undefined, gradient: null },
        };
      }),
    })),
  };
}
