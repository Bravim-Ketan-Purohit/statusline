import { span } from "../spans.js";
import { homedir } from "node:os";
export const cwdTile = {
    id: "cwd",
    displayName: "Working directory",
    category: "environment",
    tier: 0,
    capabilities: [],
    defaultProps: { segments: 2 },
    render(props, { cc }, mode) {
        const raw = cc.workspace?.current_dir ?? cc.cwd;
        if (!raw)
            return [];
        let disp = raw;
        const home = homedir();
        if (disp.startsWith(home))
            disp = "~" + disp.slice(home.length);
        const parts = disp.split("/").filter(Boolean);
        const keep = mode === "compact" ? 1 : Math.max(1, props.segments);
        if (parts.length > keep)
            disp = parts.slice(-keep).join("/");
        return [span(disp)];
    },
};
