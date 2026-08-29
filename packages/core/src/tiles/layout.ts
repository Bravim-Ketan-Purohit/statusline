import { span } from "../spans.js";
import type { TileModule } from "./types.js";

const t = <P,>(m: TileModule<P>) => m;

export const textTile = t<{ text: string }>({
  id: "text", displayName: "Custom text", category: "layout", tier: 1,
  capabilities: [], defaultProps: { text: "" },
  render: (props) => (props.text ? [span(props.text)] : []),
});

export const spacerTile = t<{ width: number }>({
  id: "spacer", displayName: "Spacer", category: "layout", tier: 1,
  capabilities: [], defaultProps: { width: 2 },
  render: (props) => [span(" ".repeat(Math.max(1, Math.min(40, props.width))))],
});

/**
 * The separator exists to absorb slack. It renders one space; the solver adds
 * the rest, which right-aligns everything after it. Set `flex: true` on the
 * tile for it to do anything -- the builder does this when you add one.
 */
export const separatorTile = t<Record<string, never>>({
  id: "separator", displayName: "Flex separator", category: "layout", tier: 1,
  capabilities: [], defaultProps: {},
  render: () => [span(" ")],
});

export const commandTile = t<{ command: string; label: string; ttl: number }>({
  id: "command", displayName: "Custom command", category: "layout", tier: 2,
  capabilities: [], defaultProps: { command: "", label: "", ttl: 30 },
  render(props, { custom }, mode) {
    // The host runs and caches the command; the tile only formats the result.
    const out = custom?.[props.command];
    if (!out) return [];
    const text = out.split("\n")[0]!;
    return [span(mode === "compact" ? text.slice(0, 24) : text.slice(0, 120))];
  },
});
