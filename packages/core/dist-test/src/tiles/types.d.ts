import type { Span, RenderMode } from "../spans.js";
import type { RuntimeData } from "../runtime.js";
export type Capability = "needsGit" | "needsNetwork" | "needsDaemon" | "webOnly";
export interface TileModule<P = Record<string, unknown>> {
    id: string;
    displayName: string;
    category: "session" | "git" | "environment" | "personal" | "media" | "layout";
    tier: 0 | 1 | 2 | 3 | 4;
    capabilities: Capability[];
    /** Zod-less light default fill; the web builder gets the real schema later. */
    defaultProps: P;
    /**
     * Return [] when the underlying field is absent. The layout solver treats an
     * empty span list as "this tile does not exist", so it never leaves a hole.
     */
    render(props: P, data: RuntimeData, mode: RenderMode): Span[];
}
