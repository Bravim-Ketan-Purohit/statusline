import { span, type Span } from "../spans.js";
import type { TileModule } from "./types.js";
import { humanDelta } from "./util.js";

/**
 * Network-backed tiles.
 *
 * Counts, never titles. A variable-length issue title cannot be compressed,
 * and half a sentence read in peripheral vision delivers the anxiety without
 * the information -- so these say how many, and the drill shows which.
 */
const t = <P,>(m: TileModule<P>) => m;
const NET = ["needsNetwork"] as const;

export const linearAssignedTile = t<Record<string, never>>({
  id: "linear-assigned", displayName: "Linear assigned", category: "session", tier: 4,
  capabilities: [...NET], defaultProps: {},
  render: (_p, d) => (!d.linear?.available || d.linear.assigned === undefined
    ? [] : [span(String(d.linear.assigned))]),
});

export const linearStartedTile = t<Record<string, never>>({
  id: "linear-started", displayName: "Linear in progress", category: "session", tier: 4,
  capabilities: [...NET], defaultProps: {},
  render: (_p, d) => (!d.linear?.started ? [] : [span(String(d.linear.started))]),
});

export const linearReviewTile = t<Record<string, never>>({
  id: "linear-review", displayName: "Linear in review", category: "session", tier: 4,
  capabilities: [...NET], defaultProps: {},
  render: (_p, d) => (!d.linear?.review ? [] : [span(String(d.linear.review))]),
});

export const linearTriageTile = t<Record<string, never>>({
  id: "linear-triage", displayName: "Linear triage queue", category: "session", tier: 4,
  capabilities: [...NET], defaultProps: {},
  render: (_p, d) => (!d.linear?.triage ? [] : [span(String(d.linear.triage))]),
});

export const sentryIssuesTile = t<{ warnAt: number }>({
  id: "sentry-issues", displayName: "Sentry unresolved", category: "session", tier: 4,
  capabilities: [...NET], defaultProps: { warnAt: 10 },
  render(props, d) {
    if (!d.sentry?.available || d.sentry.issues === undefined) return [];
    const n = d.sentry.issues;
    return [span(String(n), { fg: n >= props.warnAt ? "#ff5f5f" : undefined })];
  },
});

export const sentryEventsTile = t<Record<string, never>>({
  id: "sentry-events", displayName: "Sentry events 24h", category: "session", tier: 4,
  capabilities: [...NET], defaultProps: {},
  render(_p, d, mode) {
    const n = d.sentry?.events24h;
    if (n === undefined) return [];
    const s = n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
    return mode === "compact" ? [span(s)] : [span(s), span(" /24h", { dim: true })];
  },
});

const DEPLOY_STATE: Record<string, { icon: string; word: string; fg?: string }> = {
  READY:     { icon: "✓", word: "ready",    fg: "#87d787" },
  BUILDING:  { icon: "◍", word: "building", fg: "#d7af5f" },
  QUEUED:    { icon: "◌", word: "queued",   fg: "#d7af5f" },
  ERROR:     { icon: "✗", word: "failed",   fg: "#ff5f5f" },
  CANCELED:  { icon: "◌", word: "canceled", fg: "#8a8a8a" },
};

export const deployStatusTile = t<Record<string, never>>({
  id: "deploy-status", displayName: "Deploy status", category: "session", tier: 4,
  capabilities: [...NET], defaultProps: {},
  render(_p, d, mode) {
    if (!d.deploy?.available || !d.deploy.state) return [];
    const m = DEPLOY_STATE[d.deploy.state] ?? { icon: "○", word: d.deploy.state.toLowerCase() };
    const out: Span[] = [span(m.icon, { fg: m.fg })];
    if (mode === "full") out.push(span(" " + m.word, { fg: m.fg }));
    return out;
  },
});

export const deployDurationTile = t<Record<string, never>>({
  id: "deploy-duration", displayName: "Deploy duration", category: "session", tier: 4,
  capabilities: [...NET], defaultProps: {},
  render: (_p, d) => (!d.deploy?.durationMs ? [] : [span(humanDelta(d.deploy.durationMs / 1000))]),
});

export const deployUrlTile = t<Record<string, never>>({
  id: "deploy-url", displayName: "Preview URL", category: "session", tier: 4,
  capabilities: [...NET], defaultProps: {},
  // OSC 8: clickable in Claude Code, plain text in tmux. The adapters differ.
  render: (_p, d, mode) => (!d.deploy?.url ? []
    : [span(mode === "compact" ? "↗" : "preview ↗", { link: d.deploy.url })]),
});
