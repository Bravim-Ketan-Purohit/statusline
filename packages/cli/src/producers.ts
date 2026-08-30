import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { run, has, cacheWrite, releaseLock } from "./cache.js";

export interface GitData {
  branch: string; ahead: number; behind: number;
  staged: number; modified: number; untracked: number; conflict: number;
  stash: number; sha: string; last: string; web: string;
  diffAdded: number; diffRemoved: number;
}

export function produceGit(root: string): GitData {
  // --no-optional-locks so a background refresh never races index.lock with
  // the user's interactive shell.
  const g = (args: string[], t = 5000) => run("git", ["--no-optional-locks", ...args], root, t);
  const out = g(["status", "--porcelain=v1", "-b", "--untracked-files=normal"]);
  let branch = "", ahead = 0, behind = 0;
  let staged = 0, modified = 0, untracked = 0, conflict = 0;

  out.split("\n").forEach((line, i) => {
    if (i === 0 && line.startsWith("##")) {
      let head = line.slice(3), track = "";
      const b = head.indexOf(" [");
      if (b !== -1) { track = head.slice(b); head = head.slice(0, b); }
      branch = head.split("...")[0]!.trim();
      if (branch.includes("no branch")) branch = "";
      ahead = Number(/ahead (\d+)/.exec(track)?.[1] ?? 0);
      behind = Number(/behind (\d+)/.exec(track)?.[1] ?? 0);
      return;
    }
    if (!line) return;
    const xy = line.slice(0, 2);
    if (xy === "??") untracked++;
    else if (xy.includes("U") || xy === "AA" || xy === "DD") conflict++;
    else {
      if (xy[0] !== " " && xy[0] !== "?") staged++;
      if (xy[1] !== " " && xy[1] !== "?") modified++;
    }
  });

  const sha = g(["rev-parse", "--short", "HEAD"], 3000);
  if (!branch) branch = sha ? `detached@${sha}` : "";

  let last = g(["log", "-1", "--format=%cr"], 3000);
  for (const [long, short] of [["minutes","m"],["minute","m"],["seconds","s"],["second","s"],
                               ["hours","h"],["hour","h"],["days","d"],["day","d"],
                               ["weeks","w"],["week","w"],["months","mo"],["month","mo"],
                               ["years","y"],["year","y"]] as const) {
    last = last.replace(" " + long, short);
  }

  const shortstat = g(["diff", "--shortstat"], 4000);
  const diffAdded = Number(/(\d+) insertion/.exec(shortstat)?.[1] ?? 0);
  const diffRemoved = Number(/(\d+) deletion/.exec(shortstat)?.[1] ?? 0);
  const stash = g(["stash", "list"], 3000).split("\n").filter(Boolean).length;

  const remote = g(["config", "--get", "remote.origin.url"], 3000);
  let web = "";
  if (remote) {
    let w = remote.replace(/^git@([^:]+):/, "https://$1/").replace(/^ssh:\/\/git@/, "https://").replace(/\.git$/, "");
    if (w.startsWith("http")) web = w;
  }
  return { branch, ahead, behind, staged, modified, untracked, conflict, stash, sha, last, web, diffAdded, diffRemoved };
}

export interface GhData { available: boolean; open?: number; mine?: number; review?: number; issues?: number; notifications?: number }

export function produceGh(root: string): GhData {
  if (!has("gh")) return { available: false };
  const count = (extra: string[]) => {
    const out = run("gh", ["pr", "list", "--state", "open", "--limit", "100", "--json", "number", ...extra], root, 15_000);
    try { return (JSON.parse(out) as unknown[]).length; } catch { return null; }
  };
  const open = count([]);
  if (open === null) return { available: false };
  const issuesOut = run("gh", ["issue", "list", "--state", "open", "--limit", "100", "--json", "number"], root, 15_000);
  let issues = 0;
  try { issues = (JSON.parse(issuesOut) as unknown[]).length; } catch { /* none */ }
  return {
    available: true, open,
    mine: count(["--author", "@me"]) ?? 0,
    review: count(["--search", "review-requested:@me"]) ?? 0,
    issues,
  };
}

export interface CiData { available: boolean; status?: string | null; conclusion?: string | null }

export function produceCi(root: string): CiData {
  if (!has("gh")) return { available: false };
  const br = run("git", ["--no-optional-locks", "rev-parse", "--abbrev-ref", "HEAD"], root, 3000);
  if (!br || br === "HEAD") return { available: false };
  const out = run("gh", ["run", "list", "--branch", br, "--limit", "1", "--json", "conclusion,status"], root, 15_000);
  try {
    const runs = JSON.parse(out) as { status?: string; conclusion?: string }[];
    if (!runs.length) return { available: true, status: null, conclusion: null };
    return { available: true, status: runs[0]!.status ?? null, conclusion: runs[0]!.conclusion ?? null };
  } catch { return { available: false }; }
}

export interface SkillsData { recs: string[] }

const EXT_WORDS: Record<string, string[]> = {
  py: ["python"], ipynb: ["python", "notebook", "data"], js: ["javascript", "node"],
  mjs: ["javascript", "node"], ts: ["typescript", "node"],
  tsx: ["typescript", "react", "frontend", "ui"], jsx: ["javascript", "react", "frontend", "ui"],
  rs: ["rust"], go: ["golang"], rb: ["ruby"], java: ["java"],
  swift: ["swift", "ios", "apple"], kt: ["kotlin", "android"],
  css: ["css", "frontend", "styling"], scss: ["css", "styling"], html: ["html", "web", "frontend"],
  sql: ["database", "sql"], sh: ["shell", "bash"], md: ["docs", "documentation", "writing"],
  yaml: ["config", "deploy"], yml: ["config", "deploy"], tf: ["terraform", "infra"],
  csv: ["data", "analysis"], xlsx: ["spreadsheet"], pptx: ["presentation", "slides"], pdf: ["pdf"],
};
const MARKERS: Record<string, string[]> = {
  "package.json": ["javascript", "typescript", "node", "npm", "frontend", "web"],
  "tsconfig.json": ["typescript", "frontend"], "pyproject.toml": ["python"],
  "requirements.txt": ["python"], "Cargo.toml": ["rust"], "go.mod": ["golang"],
  "Package.swift": ["swift", "ios"], Dockerfile: ["docker", "container", "deploy"],
  ".github": ["ci", "workflow", "actions", "deploy"],
};

function frontmatter(p: string): { name: string; desc: string } | null {
  try {
    const text = readFileSync(p, "utf8").slice(0, 4000);
    if (!text.startsWith("---")) return null;
    const end = text.indexOf("\n---", 3);
    if (end === -1) return null;
    const block = text.slice(3, end);
    const name = /^name:\s*(.+)$/m.exec(block)?.[1]?.trim().replace(/^["']|["']$/g, "");
    const desc = /^description:\s*([\s\S]+?)$/m.exec(block)?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
    return name ? { name, desc: desc.slice(0, 600) } : null;
  } catch { return null; }
}

export function produceSkills(root: string): SkillsData {
  const skills: { name: string; desc: string }[] = [];
  for (const base of [join(homedir(), ".claude", "skills"), join(root, ".claude", "skills")]) {
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const m = frontmatter(join(base, d.name, "SKILL.md"));
      if (m) skills.push(m);
    }
  }
  if (!skills.length) return { recs: [] };

  const changed = [
    ...run("git", ["--no-optional-locks", "diff", "--name-only", "HEAD"], root, 4000).split("\n"),
    ...run("git", ["--no-optional-locks", "diff", "--cached", "--name-only"], root, 4000).split("\n"),
  ].filter(Boolean).slice(0, 300);

  const signals = new Set<string>();
  for (const f of changed) {
    const ext = (f.split(".").pop() ?? "").toLowerCase();
    if (ext && ext !== f) { signals.add(ext); (EXT_WORDS[ext] ?? []).forEach((w) => signals.add(w)); }
    (f.split("/").pop() ?? "").toLowerCase().match(/[a-z]{4,}/g)?.forEach((w) => signals.add(w));
  }
  for (const [m, words] of Object.entries(MARKERS)) {
    if (existsSync(join(root, m))) words.forEach((w) => signals.add(w));
  }
  const sig = new Set([...signals].filter((s) => s.length > 2));
  if (!sig.size) return { recs: [] };

  const scored = skills.map((s) => {
    const nameW = new Set(s.name.toLowerCase().match(/[a-z0-9]+/g) ?? []);
    const descW = new Set(s.desc.toLowerCase().match(/[a-z0-9]+/g) ?? []);
    let score = 0;
    for (const w of sig) { if (nameW.has(w)) score += 3; if (descW.has(w)) score += 1; }
    return { name: s.name, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return { recs: [...new Set(scored.map((x) => x.name))].slice(0, 3) };
}

import { produceBattery } from "./local.js";
import { produceLinear, produceSentry, produceVercel } from "./integrations.js";

export interface SafetyData { kubeContext?: string; gcpProject?: string }

/**
 * Cloud context. Both shell out, so both are cached and never touched on the
 * render path. AWS is absent here on purpose: it is an env var, which is free.
 */
export function produceKube(): SafetyData {
  if (!has("kubectl")) return {};
  const ctx = run("kubectl", ["config", "current-context"], undefined, 3000);
  return ctx ? { kubeContext: ctx } : {};
}

export function produceGcp(): SafetyData {
  // gcloud is slow to start, so prefer the env var when it is set.
  const env = process.env.CLOUDSDK_CORE_PROJECT;
  if (env) return { gcpProject: env };
  if (!has("gcloud")) return {};
  const proj = run("gcloud", ["config", "get-value", "project"], undefined, 8000);
  return proj && proj !== "(unset)" ? { gcpProject: proj } : {};
}

export const PRODUCERS: Record<string, (root: string) => unknown> = {
  git: produceGit, gh: produceGh, ci: produceCi, skills: produceSkills,
  battery: () => produceBattery(),
  kube: () => produceKube(),
  gcp: () => produceGcp(),
  linear: () => produceLinear(),
  sentry: () => produceSentry(),
  deploy: () => produceVercel(),
};

export function doRefresh(kind: string, root: string) {
  try {
    const p = PRODUCERS[kind];
    if (p) cacheWrite(kind, root, p(root));
  } catch { /* a failed refresh leaves the stale value in place */ }
  finally { releaseLock(kind, root); }
}
