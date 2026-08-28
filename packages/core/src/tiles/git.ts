import { span, type Span } from "../spans.js";
import type { TileModule } from "./types.js";

const t = <P,>(m: TileModule<P>) => m;
const G = "#87d787", Y = "#d7af5f", C = "#5fafd7", R = "#ff5f5f", O = "#ffaf5f";

export const gitCountsTile = t<Record<string, never>>({
  id: "git-counts", displayName: "Git file counts", category: "git", tier: 2,
  capabilities: ["needsGit"], defaultProps: {},
  render(_p, { git }, mode) {
    if (!git) return [];
    const out: Span[] = [];
    const push = (n: number | undefined, sym: string, label: string, fg: string) => {
      if (!n) return;
      if (out.length) out.push(span(" "));
      out.push(span(`${sym}${n}`, { fg }));
      if (mode === "full") out.push(span(` ${label}`, { dim: true }));
    };
    push(git.staged, "+", "staged", G);
    push(git.modified, "~", "mod", Y);
    push(git.untracked, "?", "new", C);
    push(git.conflict, "!", "conflict", R);
    return out;
  },
});

export const gitAheadBehindTile = t<Record<string, never>>({
  id: "git-ahead-behind", displayName: "Ahead / behind", category: "git", tier: 2,
  capabilities: ["needsGit"], defaultProps: {},
  render(_p, { git }) {
    if (!git) return [];
    const out: Span[] = [];
    if (git.ahead) out.push(span(`⇡${git.ahead}`, { fg: C }));
    if (git.behind) { if (out.length) out.push(span(" ")); out.push(span(`⇣${git.behind}`, { fg: O })); }
    return out;
  },
});

export const gitLastCommitTile = t<Record<string, never>>({
  id: "git-last-commit", displayName: "Last commit age", category: "git", tier: 2,
  capabilities: ["needsGit"], defaultProps: {},
  render: (_p, { git }) => (git?.last ? [span(git.last)] : []),
});

export const gitStashTile = t<Record<string, never>>({
  id: "git-stash", displayName: "Stash count", category: "git", tier: 2,
  capabilities: ["needsGit"], defaultProps: {},
  render: (_p, { git }) => (git?.stash ? [span(String(git.stash))] : []),
});

export const gitShaTile = t<Record<string, never>>({
  id: "git-sha", displayName: "Commit SHA", category: "git", tier: 2,
  capabilities: ["needsGit"], defaultProps: {},
  render: (_p, { git }) => (git?.sha ? [span(git.sha)] : []),
});

export const gitDiffTile = t<Record<string, never>>({
  id: "git-diff", displayName: "Uncommitted diff", category: "git", tier: 2,
  capabilities: ["needsGit"], defaultProps: {},
  render(_p, { git }) {
    const a = git?.diffAdded ?? 0, r = git?.diffRemoved ?? 0;
    if (!a && !r) return [];
    return [span(`+${a}`, { fg: G }), span("/", { dim: true }), span(`-${r}`, { fg: R })];
  },
});

export const worktreeTile = t<Record<string, never>>({
  id: "worktree", displayName: "Worktree", category: "git", tier: 0,
  capabilities: [], defaultProps: {},
  render(_p, { cc }) {
    const n = cc.worktree?.name ?? cc.workspace?.git_worktree;
    return n ? [span(n)] : [];
  },
});

export const repoSlugTile = t<Record<string, never>>({
  id: "repo-slug", displayName: "Repo slug", category: "git", tier: 0,
  capabilities: [], defaultProps: {},
  render(_p, { cc, git }) {
    const r = cc.workspace?.repo;
    if (!r?.owner || !r.name) return [];
    const slug = `${r.owner}/${r.name}`;
    return [span(slug, { link: git?.web || `https://${r.host ?? "github.com"}/${slug}` })];
  },
});

const PR_STATE: Record<string, { icon: string; fg: string }> = {
  approved: { icon: "✓", fg: G },
  changes_requested: { icon: "✗", fg: R },
  pending: { icon: "•", fg: Y },
  draft: { icon: "◌", fg: "#8a8a8a" },
};

export const prTile = t<{ showState: boolean }>({
  id: "pr", displayName: "Branch PR", category: "git", tier: 0,
  capabilities: [], defaultProps: { showState: true },
  render(props, { cc }, mode) {
    const pr = cc.pr;
    if (!pr?.number) return [];
    const kind = pr.kind === "mr" ? "MR" : "PR";
    const st = PR_STATE[pr.review_state ?? ""] ?? { icon: "•", fg: "#8a8a8a" };
    const out = [span(`${kind} #${pr.number}`, { link: pr.url })];
    if (props.showState) {
      out.push(span(` ${st.icon}`, { fg: st.fg }));
      if (mode === "full" && pr.review_state) {
        out.push(span(` ${pr.review_state.replace(/_/g, " ")}`, { dim: true }));
      }
    }
    return out;
  },
});

const CI_MAP: Record<string, { icon: string; word: string; fg: string }> = {
  success:   { icon: "✓", word: "passing",   fg: G },
  failure:   { icon: "✗", word: "failing",   fg: R },
  timed_out: { icon: "✗", word: "timed out", fg: R },
  cancelled: { icon: "◌", word: "cancelled", fg: "#8a8a8a" },
  skipped:   { icon: "◌", word: "skipped",   fg: "#8a8a8a" },
  neutral:   { icon: "○", word: "neutral",   fg: "#8a8a8a" },
};

export const ciTile = t<Record<string, never>>({
  id: "ci", displayName: "CI status", category: "git", tier: 4,
  capabilities: ["needsNetwork"], defaultProps: {},
  render(_p, { ci }, mode) {
    if (!ci?.available) return [];
    if (ci.conclusion) {
      const m = CI_MAP[ci.conclusion] ?? { icon: "○", word: ci.conclusion, fg: "#8a8a8a" };
      return mode === "full"
        ? [span(`${m.icon} ${m.word}`, { fg: m.fg })]
        : [span(m.icon, { fg: m.fg })];
    }
    if (ci.status && ["in_progress", "queued", "requested", "waiting"].includes(ci.status)) {
      return [span(mode === "full" ? "◍ running" : "◍", { fg: Y })];
    }
    return [];
  },
});

const ghNum = (n: number | undefined) => (n === undefined ? null : n);

export const ghPrCountsTile = t<Record<string, never>>({
  id: "gh-pr-counts", displayName: "Repo PR counts", category: "git", tier: 4,
  capabilities: ["needsNetwork"], defaultProps: {},
  render(_p, { gh }, mode) {
    if (!gh?.available) return [];
    const out = [span(`${gh.open ?? 0} open`)];
    if (mode === "full") {
      if (gh.mine) out.push(span(" · ", { dim: true }), span(`${gh.mine} mine`));
      if (gh.review) out.push(span(" · ", { dim: true }), span(`${gh.review} review`, { fg: O }));
    }
    return out;
  },
});

export const ghIssuesTile = t<Record<string, never>>({
  id: "gh-issues", displayName: "Open issues", category: "git", tier: 4,
  capabilities: ["needsNetwork"], defaultProps: {},
  render: (_p, { gh }) => (gh?.available && ghNum(gh.issues) ? [span(String(gh.issues))] : []),
});
