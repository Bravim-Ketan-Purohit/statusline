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

/** Marked flex by the layout solver; renders nothing itself. */
export const separatorTile = t<Record<string, never>>({
  id: "separator", displayName: "Flex separator", category: "layout", tier: 1,
  capabilities: [], defaultProps: {},
  render: () => [span(" ")],
});

export const commandTile = t<{ command: string; label: string }>({
  id: "command", displayName: "Custom command", category: "layout", tier: 2,
  capabilities: [], defaultProps: { command: "", label: "" },
  render(props, { custom }, _mode) {
    // The host runs and caches the command; the tile only formats the result.
    const key = props.command;
    const out = custom?.[key];
    return out ? [span(out.split("\n")[0]!.slice(0, 120))] : [];
  },
});
