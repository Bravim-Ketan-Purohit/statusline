import type { RuntimeData } from "./runtime.js";

/**
 * Conditional styling.
 *
 * A tile can declare rules: "when CI is failing, blink the border red". The
 * signal set is a closed enum rather than an expression language, because the
 * builder has to present it as a dropdown and because evaluating arbitrary
 * user expressions on every render is not a thing this should ever do.
 *
 * Blink is computed here from the wall clock rather than emitted as SGR 5.
 * Real terminal blink is widely disabled and inconsistently rendered; deriving
 * it ourselves works everywhere and is bounded by the redraw rate anyway.
 */

export type SignalId =
  | "ci.failing" | "ci.passing" | "ci.running"
  | "pr.approved" | "pr.changes" | "pr.pending" | "pr.open"
  | "context.above" | "fivehour.above" | "sevenday.above"
  | "git.conflict" | "git.dirty" | "git.ahead" | "git.behind" | "git.clean"
  | "cost.above" | "battery.below" | "review.waiting" | "always";

export interface SignalDef {
  id: SignalId;
  name: string;
  /** needs a threshold value from the user */
  threshold?: { label: string; min: number; max: number; step: number; def: number };
  note: string;
}

export const SIGNALS: SignalDef[] = [
  { id: "ci.failing",  name: "CI failing",        note: "The latest run on this branch concluded in failure." },
  { id: "ci.passing",  name: "CI passing",        note: "The latest run concluded successfully." },
  { id: "ci.running",  name: "CI running",        note: "A run is queued or in progress." },
  { id: "pr.approved", name: "PR approved",       note: "The open PR is approved." },
  { id: "pr.changes",  name: "PR changes wanted", note: "A reviewer requested changes." },
  { id: "pr.pending",  name: "PR review pending", note: "The PR is open and awaiting review." },
  { id: "pr.open",     name: "PR open",           note: "Any open PR exists for this branch." },
  { id: "git.conflict",name: "Merge conflict",    note: "At least one conflicted path." },
  { id: "git.dirty",   name: "Working tree dirty",note: "Modified or untracked files above the count.",
    threshold: { label: "files", min: 1, max: 200, step: 1, def: 1 } },
  { id: "git.ahead",   name: "Unpushed commits",  note: "Ahead of upstream by at least this many.",
    threshold: { label: "commits", min: 1, max: 100, step: 1, def: 1 } },
  { id: "git.behind",  name: "Behind upstream",   note: "Behind by at least this many.",
    threshold: { label: "commits", min: 1, max: 100, step: 1, def: 1 } },
  { id: "git.clean",   name: "Working tree clean",note: "Nothing staged, modified, untracked or conflicted." },
  { id: "context.above",  name: "Context above",  note: "Context window usage crosses this percentage.",
    threshold: { label: "%", min: 1, max: 100, step: 1, def: 80 } },
  { id: "fivehour.above", name: "5h limit above", note: "The five-hour window crosses this percentage.",
    threshold: { label: "%", min: 1, max: 100, step: 1, def: 80 } },
  { id: "sevenday.above", name: "7d limit above", note: "The seven-day window crosses this percentage.",
    threshold: { label: "%", min: 1, max: 100, step: 1, def: 80 } },
  { id: "cost.above",     name: "Cost above",     note: "Session spend crosses this many dollars.",
    threshold: { label: "$", min: 1, max: 500, step: 1, def: 20 } },
  { id: "battery.below",  name: "Battery below",  note: "Battery drops under this percentage, unplugged.",
    threshold: { label: "%", min: 1, max: 100, step: 1, def: 20 } },
  { id: "review.waiting", name: "Reviews waiting",note: "Pull requests are awaiting your review." },
  { id: "always",         name: "Always",         note: "Unconditional; useful for a steady accent." },
];

export function signalActive(sig: SignalId, threshold: number | undefined, d: RuntimeData): boolean {
  const n = (v: number | undefined | null, def = 0) => (v === undefined || v === null ? def : v);
  const t = threshold ?? 0;
  switch (sig) {
    case "always":        return true;
    case "ci.failing":    return d.ci?.conclusion === "failure" || d.ci?.conclusion === "timed_out";
    case "ci.passing":    return d.ci?.conclusion === "success";
    case "ci.running":    return !!d.ci?.status && ["in_progress", "queued", "requested", "waiting"].includes(d.ci.status);
    case "pr.approved":   return d.cc.pr?.review_state === "approved";
    case "pr.changes":    return d.cc.pr?.review_state === "changes_requested";
    case "pr.pending":    return d.cc.pr?.review_state === "pending";
    case "pr.open":       return !!d.cc.pr?.number;
    case "git.conflict":  return n(d.git?.conflict) > 0;
    case "git.dirty":     return n(d.git?.modified) + n(d.git?.untracked) >= Math.max(1, t);
    case "git.ahead":     return n(d.git?.ahead) >= Math.max(1, t);
    case "git.behind":    return n(d.git?.behind) >= Math.max(1, t);
    case "git.clean":     return !!d.git?.branch &&
      n(d.git?.staged) + n(d.git?.modified) + n(d.git?.untracked) + n(d.git?.conflict) === 0;
    case "context.above": {
      const p = d.cc.context_window?.used_percentage;
      return p !== null && p !== undefined && p >= t;   // null pre-first-call: not a trigger
    }
    case "fivehour.above": {
      const p = d.cc.rate_limits?.five_hour?.used_percentage;
      return p !== undefined && p >= t;
    }
    case "sevenday.above": {
      const p = d.cc.rate_limits?.seven_day?.used_percentage;
      return p !== undefined && p >= t;
    }
    case "cost.above":    return n(d.cc.cost?.total_cost_usd) >= t;
    case "battery.below": {
      const b = d.system?.battery;
      return !!b && !b.charging && b.percent <= t;
    }
    case "review.waiting": return n(d.gh?.review) > 0;
    default: return false;
  }
}

// --- borders ---------------------------------------------------------------

/** Edge characters cost columns; lines are SGR and cost none. */
export type EdgeStyle = "none" | "thin" | "block" | "bracket" | "round" | "angle" | "powerline";
export type LineStyle = "none" | "under" | "over" | "both";

export const EDGES: Record<EdgeStyle, [string, string]> = {
  none: ["", ""],
  thin: ["▏", "▕"],
  block: ["▌", "▐"],
  bracket: ["[", "]"],
  round: ["(", ")"],
  angle: ["❬", "❭"],
  powerline: ["", ""],   // Nerd Font half-circles
};

export const EDGE_LIST: { id: EdgeStyle; name: string; cols: number; needsNerdFont?: boolean }[] = [
  { id: "none", name: "None", cols: 0 },
  { id: "thin", name: "Thin bar", cols: 2 },
  { id: "block", name: "Half block", cols: 2 },
  { id: "bracket", name: "Bracket", cols: 2 },
  { id: "round", name: "Round", cols: 2 },
  { id: "angle", name: "Angle", cols: 2 },
  { id: "powerline", name: "Powerline cap", cols: 2, needsNerdFont: true },
];

export interface Border {
  edge: EdgeStyle;
  line: LineStyle;
  color?: string;
}

export interface BlinkSpec {
  /** what the blink recolours */
  target: "border" | "bg" | "fg";
  color: string;
  /** cycles per second; the terminal's redraw rate is the real ceiling */
  hz: number;
}

export interface Rule {
  signal: SignalId;
  threshold?: number;
  fg?: string;
  bg?: string;
  border?: Border;
  blink?: BlinkSpec;
}

export interface ResolvedEffect {
  fg?: string;
  bg?: string;
  border?: Border;
  /** already resolved for this instant: the colour to use, or undefined */
  blinkColor?: string;
  blinkTarget?: BlinkSpec["target"];
  /** which signals fired, for the builder to show */
  fired: SignalId[];
}

/** On for the first half of each cycle. Derived, so it works everywhere. */
export function blinkOn(hz: number, nowMs: number): boolean {
  const period = 1000 / Math.max(0.05, hz);
  return (nowMs % period) < period / 2;
}

/**
 * Later rules win, so the list reads as an override chain. A blink is only
 * applied while its rule is firing, which is what makes a red CI border stop
 * the moment the build goes green.
 */
export function evaluateRules(rules: Rule[] | undefined, d: RuntimeData, nowMs: number): ResolvedEffect {
  const out: ResolvedEffect = { fired: [] };
  if (!rules?.length) return out;
  for (const r of rules) {
    if (!signalActive(r.signal, r.threshold, d)) continue;
    out.fired.push(r.signal);
    if (r.fg) out.fg = r.fg;
    if (r.bg) out.bg = r.bg;
    if (r.border) out.border = r.border;
    if (r.blink && blinkOn(r.blink.hz, nowMs)) {
      out.blinkColor = r.blink.color;
      out.blinkTarget = r.blink.target;
    } else if (r.blink) {
      out.blinkTarget = r.blink.target;   // known target, off phase
    }
  }
  return out;
}
