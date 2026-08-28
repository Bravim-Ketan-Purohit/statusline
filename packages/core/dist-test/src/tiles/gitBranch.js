import { span } from "../spans.js";
/**
 * Tier 1: the CLI parses .git/HEAD directly (no subprocess), so this tile just
 * formats what it was handed. Detached HEAD arrives pre-shortened.
 */
export const gitBranchTile = {
    id: "git-branch",
    displayName: "Git branch",
    category: "git",
    tier: 1,
    capabilities: ["needsGit"],
    defaultProps: {},
    render(_p, { local }) {
        if (!local.gitBranch)
            return [];
        return [span(local.gitBranch, { bold: true })];
    },
};
