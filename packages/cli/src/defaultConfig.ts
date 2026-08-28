import type { Config } from "@statusline/core";

/** Phase 1 starter layout: the six tiles, laid out across three rows. */
export const DEFAULT_CONFIG: Config = {
  version: 1,
  meta: { name: "phase-1", cellWidth: 8.4 },
  theme: {
    terminalBg: "#16181c",
    palette: { accent: "#d78700", muted: "#6c6f85" },
    colorMode: "truecolor",
    font: { nerdFont: false },
  },
  breakpoints: [
    { id: "xs", minCols: 0 },
    { id: "sm", minCols: 40 },
    { id: "md", minCols: 80 },
    { id: "lg", minCols: 120 },
    { id: "xl", minCols: 160 },
    { id: "2xl", minCols: 220 },
  ],
  rows: [
    {
      id: "row-1",
      tiles: [
        {
          id: "t-clock", type: "clock",
          props: { tz: "America/Chicago", hour12: true },
          style: { bg: "#005f87", fg: "#d7ffff", gradient: null, glyph: "◷", label: "time", labelDim: true },
          action: null, flex: false,
          responsive: { priority: 3, xs: { hidden: true }, sm: { compact: true }, md: { hidden: false, compact: false } },
        },
        {
          id: "t-model", type: "model", props: {},
          style: { bg: "#5f00af", fg: "#e4b8ff", gradient: null, glyph: "✦", label: "model", labelDim: true },
          action: null, flex: false,
          responsive: { priority: 1, sm: { compact: true }, md: { compact: false } },
        },
        {
          id: "t-cwd", type: "cwd", props: { segments: 2 },
          style: { bg: "#005faf", fg: "#d7ffff", gradient: null, glyph: "▸", label: "dir", labelDim: true },
          action: null, flex: false,
          responsive: { priority: 2, xs: { hidden: true }, sm: { compact: true }, md: { hidden: false, compact: false } },
        },
      ],
    },
    {
      id: "row-2",
      tiles: [
        {
          id: "t-branch", type: "git-branch", props: {},
          style: { bg: "#005f00", fg: "#d7ffd7", gradient: null, glyph: "⎇", label: "branch", labelDim: true },
          action: null, flex: false,
          responsive: { priority: 1, sm: { compact: true }, md: { compact: false } },
        },
      ],
    },
    {
      id: "row-3",
      tiles: [
        {
          id: "t-ctx", type: "context-bar", props: { width: 8 },
          style: { bg: "#00005f", fg: "#afd7ff", gradient: null, glyph: "▦", label: "ctx", labelDim: true },
          action: null, flex: false,
          responsive: { priority: 1, sm: { compact: true }, md: { compact: false } },
        },
        {
          id: "t-5h", type: "five-hour-bar", props: { width: 8 },
          style: { bg: "#5f0000", fg: "#ffd7d7", gradient: null, glyph: "⧗", label: "5h cap", labelDim: true },
          action: null, flex: false,
          responsive: { priority: 2, xs: { hidden: true }, sm: { compact: true }, md: { hidden: false, compact: false } },
        },
      ],
    },
  ],
  targets: {
    claudeCode: { enabled: true, maxRows: 5, style: "pills" },
    tmux: { enabled: false, side: "right", maxWidth: 120 },
    web: { enabled: true },
  },
  daemon: { enabled: false, port: 7717 },
};
