import { span } from "../spans.js";
import type { TileModule } from "./types.js";
import { humanDelta } from "./util.js";
import { renderBar, barColor } from "./contextBar.js";

const t = <P,>(m: TileModule<P>) => m;

export const effortTile = t<Record<string, never>>({
  id: "effort", displayName: "Thinking effort", category: "session", tier: 0,
  capabilities: [], defaultProps: {},
  render: (_p, { cc }) => (cc.effort?.level ? [span(cc.effort.level)] : []),
});

export const sessionNameTile = t<Record<string, never>>({
  id: "session-name", displayName: "Session name", category: "session", tier: 0,
  capabilities: [], defaultProps: {},
  render: (_p, { cc }) => (cc.session_name ? [span(cc.session_name, { bold: true })] : []),
});

export const durationTile = t<Record<string, never>>({
  id: "session-duration", displayName: "Session duration", category: "session", tier: 0,
  capabilities: [], defaultProps: {},
  render: (_p, { cc }) =>
    cc.cost?.total_duration_ms ? [span(humanDelta(cc.cost.total_duration_ms / 1000))] : [],
});

export const costTile = t<{ showRate: boolean; minHours: number }>({
  id: "cost", displayName: "Session cost", category: "session", tier: 0,
  capabilities: [], defaultProps: { showRate: true, minHours: 5 / 60 },
  render(props, { cc }, mode) {
    const usd = cc.cost?.total_cost_usd;
    if (usd === undefined || usd === null || usd <= 0) return [];
    const out = [span(usd.toFixed(2))];
    const hours = (cc.cost?.total_duration_ms ?? 0) / 3_600_000;
    if (mode === "full" && props.showRate && hours >= props.minHours) {
      out.push(span(" · ", { dim: true }), span(`${(usd / hours).toFixed(1)}/hr`));
    }
    return out;
  },
});

export const contextPctTile = t<Record<string, never>>({
  id: "context-pct", displayName: "Context percentage", category: "session", tier: 0,
  capabilities: [], defaultProps: {},
  render(_p, { cc }) {
    const pct = cc.context_window?.used_percentage;
    if (pct === null || pct === undefined) return [];
    return [span(`${String(Math.round(pct)).padStart(3, " ")}%`, { fg: barColor(pct) })];
  },
});

export const sevenDayTile = t<{ width: number; showBar: boolean }>({
  id: "seven-day", displayName: "7d limit", category: "session", tier: 0,
  capabilities: [], defaultProps: { width: 8, showBar: false },
  render(props, { cc }, mode) {
    const pct = cc.rate_limits?.seven_day?.used_percentage;
    if (pct === null || pct === undefined) return [];
    const out = [];
    if (props.showBar && mode === "full") {
      const { filled, empty } = renderBar(pct, props.width);
      out.push(span(filled, { fg: barColor(pct) }), span(empty, { fg: "#4e4e4e" }), span(" "));
    }
    out.push(span(`${String(Math.round(pct)).padStart(3, " ")}%`, { fg: barColor(pct) }));
    return out;
  },
});

export const linesChangedTile = t<Record<string, never>>({
  id: "lines-changed", displayName: "Lines added/removed", category: "session", tier: 0,
  capabilities: [], defaultProps: {},
  render(_p, { cc }) {
    const a = cc.cost?.total_lines_added ?? 0, r = cc.cost?.total_lines_removed ?? 0;
    if (!a && !r) return [];
    return [span(`+${a}`, { fg: "#87d787" }), span("/", { dim: true }), span(`-${r}`, { fg: "#ff5f5f" })];
  },
});

export const ccVersionTile = t<Record<string, never>>({
  id: "cc-version", displayName: "Claude Code version", category: "session", tier: 0,
  capabilities: [], defaultProps: {},
  render: (_p, { cc }) => (cc.version ? [span(`v${cc.version}`)] : []),
});

export const vimModeTile = t<Record<string, never>>({
  id: "vim-mode", displayName: "Vim mode", category: "session", tier: 0,
  capabilities: [], defaultProps: {},
  render: (_p, { cc }) => (cc.vim?.mode ? [span(cc.vim.mode, { bold: true })] : []),
});

export const agentTile = t<Record<string, never>>({
  id: "agent", displayName: "Agent", category: "session", tier: 0,
  capabilities: [], defaultProps: {},
  render: (_p, { cc }) => (cc.agent?.name ? [span(cc.agent.name)] : []),
});
