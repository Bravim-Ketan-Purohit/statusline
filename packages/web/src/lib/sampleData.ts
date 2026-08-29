import type { RuntimeData } from "@statusline/core";

/**
 * Sample data for the builder canvas, covering EVERY tile.
 *
 * A tile renders nothing when its field is missing. That is correct in a
 * terminal -- absent data must not draw an empty box -- but ruinous in a
 * design tool, where a tile you just dropped would be invisible and therefore
 * unstylable. So the canvas feeds a complete synthetic set, and the title
 * block says "synthetic" so nobody mistakes it for live data.
 */
export function sampleData(now: Date): Omit<RuntimeData, "columns"> {
  const nowSec = now.getTime() / 1000;
  return {
    cc: {
      session_id: "sheet-preview",
      session_name: "war-room",
      cwd: "/Users/you/dev/statusline",
      version: "2.1.251",
      workspace: {
        current_dir: "/Users/you/dev/statusline",
        project_dir: "/Users/you/dev/statusline",
        git_worktree: "feat-x",
        repo: { host: "github.com", owner: "you", name: "statusline" },
      },
      model: { id: "claude-opus-5", display_name: "Opus 5" },
      effort: { level: "xhigh" },
      thinking: { enabled: true },
      vim: { mode: "NORMAL" },
      agent: { name: "reviewer" },
      cost: {
        total_cost_usd: 10.91, total_duration_ms: 6_120_000,
        total_lines_added: 1255, total_lines_removed: 9,
      },
      context_window: {
        total_input_tokens: 226_000, total_output_tokens: 4_200,
        context_window_size: 1_000_000, used_percentage: 23, remaining_percentage: 77,
      },
      rate_limits: {
        five_hour: { used_percentage: 39, resets_at: nowSec + 2520 },
        seven_day: { used_percentage: 18, resets_at: nowSec + 400_000 },
      },
      pr: { number: 482, url: "https://github.com/you/statusline/pull/482", review_state: "approved" },
      worktree: { name: "feat-x", path: "/tmp/wt", branch: "feat-x" },
    },
    local: { now, home: "/Users/you", gitBranch: "main", gitRoot: "/Users/you/dev/statusline" },
    git: {
      branch: "main", ahead: 3, behind: 1,
      staged: 2, modified: 4, untracked: 12, conflict: 0,
      stash: 2, sha: "a3f9c21", last: "3h ago",
      web: "https://github.com/you/statusline",
      diffAdded: 40, diffRemoved: 6,
    },
    gh: { available: true, open: 14, mine: 3, review: 2, issues: 23 },
    ci: { available: true, status: "completed", conclusion: "success" },
    personal: {
      verses: [{ src: "Bhagavad Gita 18.43", theme: "valor",
                 en: "Heroism, vigour, firmness, skill, and not fleeing from battle.",
                 sa: "sauryam tejo dhrtir daksyam" }],
      tracks: [{ title: "Sandese Aate Hai", artist: "Sonu Nigam",
                 url: "https://music.youtube.com/search?q=Sandese+Aate+Hai" }],
      skills: ["land-and-deploy", "setup-deploy", "document-generate"],
    },
    system: {
      hostname: "mbp", venv: "venv", nodeVersion: "22.11.0", pythonVersion: "3.12",
      battery: { percent: 84, charging: false },
      // A production context on purpose, so the danger style is visible while
      // you design rather than only discovered in a real terminal.
      kubeContext: "arn:aws:eks:us-east-1:481:cluster/acme-prod",
      awsProfile: "acme-prod",
      gcpProject: "acme-staging",
    },
    custom: {
      __danger: JSON.stringify(["prod", "production", "prd", "live"]),
      __protected: JSON.stringify(["main", "master", "release"]),
    },
    media: { title: "Sandese Aate Hai", artist: "Sonu Nigam", playing: true },
  };
}
