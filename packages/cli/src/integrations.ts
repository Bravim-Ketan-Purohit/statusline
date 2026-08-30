import { readCredentials } from "./credentials.js";
import { run } from "./cache.js";

/**
 * Network integrations.
 *
 * Every one follows the same shape, so the shared parts live here and each
 * service is a small function below.
 *
 * Rules that hold for all of them:
 *  - they run only inside the detached refresh, never on the render path
 *  - counts only, never titles: a variable-length title is uncompressible and
 *    reading half a sentence in peripheral vision is worse than reading none
 *  - a missing credential means the tile renders nothing, and `doctor` says why
 *  - the token never reaches RuntimeData, so it can never reach a span
 */

const UA = "statusline/0.1";

/** Small JSON fetch with a hard timeout, via curl to avoid a dependency. */
export function fetchJson(
  url: string,
  opts: { headers?: Record<string, string>; body?: string; method?: string; timeoutMs?: number } = {},
): unknown | null {
  const args = [
    "-sS", "--max-time", String(Math.ceil((opts.timeoutMs ?? 8000) / 1000)),
    "-H", `user-agent: ${UA}`,
  ];
  for (const [k, v] of Object.entries(opts.headers ?? {})) args.push("-H", `${k}: ${v}`);
  if (opts.method) args.push("-X", opts.method);
  if (opts.body) args.push("--data-binary", opts.body);
  args.push(url);
  const out = run("curl", args, undefined, (opts.timeoutMs ?? 8000) + 2000);
  if (!out) return null;
  try { return JSON.parse(out); } catch { return null; }
}

const cred = (name: string) => readCredentials()[name];

// --- Linear -----------------------------------------------------------------

export interface LinearData {
  available: boolean;
  assigned?: number; started?: number; review?: number;
  triage?: number; cyclePct?: number;
}

const LINEAR_QUERY = `{
  viewer { assignedIssues(filter:{state:{type:{nin:["completed","canceled"]}}}) { nodes { state { type } } } }
}`;

export function produceLinear(): LinearData {
  const key = cred("linear");
  if (!key) return { available: false };
  const res = fetchJson("https://api.linear.app/graphql", {
    method: "POST",
    headers: { Authorization: key, "content-type": "application/json" },
    body: JSON.stringify({ query: LINEAR_QUERY }),
  }) as { data?: { viewer?: { assignedIssues?: { nodes?: { state?: { type?: string } }[] } } } } | null;
  const nodes = res?.data?.viewer?.assignedIssues?.nodes;
  if (!nodes) return { available: false };
  const count = (t: string) => nodes.filter((n) => n.state?.type === t).length;
  return {
    available: true,
    assigned: nodes.length,
    started: count("started"),
    review: count("review"),
    triage: count("triage"),
  };
}

// --- Sentry -----------------------------------------------------------------

export interface SentryData { available: boolean; issues?: number; events24h?: number }

export function produceSentry(): SentryData {
  const key = cred("sentry");
  const org = cred("sentry_org");
  const project = cred("sentry_project");
  if (!key || !org || !project) return { available: false };
  const res = fetchJson(
    `https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/?statsPeriod=24h&query=is:unresolved`,
    { headers: { Authorization: `Bearer ${key}` } },
  ) as { count?: string }[] | null;
  if (!Array.isArray(res)) return { available: false };
  const events = res.reduce((n, i) => n + (Number(i.count) || 0), 0);
  return { available: true, issues: res.length, events24h: events };
}

// --- Vercel -----------------------------------------------------------------

export interface DeployData {
  available: boolean;
  state?: string;          // READY | BUILDING | ERROR | QUEUED | CANCELED
  url?: string;
  durationMs?: number;
}

export function produceVercel(): DeployData {
  const key = cred("vercel");
  if (!key) return { available: false };
  const team = cred("vercel_team");
  const q = team ? `?limit=1&teamId=${encodeURIComponent(team)}` : "?limit=1";
  const res = fetchJson(`https://api.vercel.com/v6/deployments${q}`, {
    headers: { Authorization: `Bearer ${key}` },
  }) as { deployments?: { state?: string; url?: string; created?: number; ready?: number }[] } | null;
  const d = res?.deployments?.[0];
  if (!d) return { available: false };
  return {
    available: true,
    state: d.state,
    url: d.url ? `https://${d.url}` : undefined,
    durationMs: d.ready && d.created ? d.ready - d.created : undefined,
  };
}
