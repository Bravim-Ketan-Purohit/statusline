import { span } from "../spans.js";
import type { TileModule } from "./types.js";
import { isDangerous } from "../danger.js";

/**
 * Safety tiles.
 *
 * These do not inform, they prevent. Each renders the context you are about to
 * act on, and reddens the moment that context looks like production. Four
 * characters of screen for a class of mistake nothing else here catches.
 *
 * The theme is not on RuntimeData, so the danger patterns arrive through
 * `custom` under a reserved key that the host populates from the config.
 */
const t = <P,>(m: TileModule<P>) => m;

const patternsFrom = (custom: Record<string, string> | undefined): string[] => {
  try { return JSON.parse(custom?.["__danger"] ?? "[]") as string[]; }
  catch { return []; }
};

export const kubeContextTile = t<{ shortenPath: boolean }>({
  id: "kube-context", displayName: "Kubernetes context", category: "environment",
  tier: 2, capabilities: [], defaultProps: { shortenPath: true },
  render(props, data, mode) {
    const ctx = data.system?.kubeContext;
    if (!ctx) return [];
    // ARNs and GKE paths are long; the tail is the part that identifies it.
    const shown = props.shortenPath || mode === "compact"
      ? (ctx.split("/").pop() ?? ctx)
      : ctx;
    return [span(shown, { danger: isDangerous(ctx, patternsFrom(data.custom)) })];
  },
});

export const awsProfileTile = t<Record<string, never>>({
  id: "aws-profile", displayName: "AWS profile", category: "environment",
  tier: 1, capabilities: [], defaultProps: {},
  render(_p, data) {
    const prof = data.system?.awsProfile;
    if (!prof) return [];
    return [span(prof, { danger: isDangerous(prof, patternsFrom(data.custom)) })];
  },
});

export const gcpProjectTile = t<Record<string, never>>({
  id: "gcp-project", displayName: "GCP project", category: "environment",
  tier: 4, capabilities: [], defaultProps: {},
  render(_p, data) {
    const proj = data.system?.gcpProject;
    if (!proj) return [];
    return [span(proj, { danger: isDangerous(proj, patternsFrom(data.custom)) })];
  },
});

/**
 * Renders only while you are on a protected branch, and always shouts. The
 * silence the rest of the time is the feature.
 */
export const protectedBranchTile = t<Record<string, never>>({
  id: "protected-branch", displayName: "Protected branch warning",
  category: "git", tier: 1, capabilities: ["needsGit"], defaultProps: {},
  render(_p, data, mode) {
    const branch = data.git?.branch;
    if (!branch) return [];
    let list: string[] = [];
    try { list = JSON.parse(data.custom?.["__protected"] ?? "[]") as string[]; } catch { /* none */ }
    if (!list.map((b) => b.toLowerCase()).includes(branch.toLowerCase())) return [];
    return [span(mode === "compact" ? branch : `on ${branch}`, { danger: true })];
  },
});
