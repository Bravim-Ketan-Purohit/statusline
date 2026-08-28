import { span } from "../spans.js";
import type { TileModule } from "./types.js";

const t = <P,>(m: TileModule<P>) => m;

export const venvTile = t<Record<string, never>>({
  id: "venv", displayName: "Active venv", category: "environment", tier: 1,
  capabilities: [], defaultProps: {},
  render: (_p, { system }) => (system?.venv ? [span(system.venv)] : []),
});

export const nodeVersionTile = t<Record<string, never>>({
  id: "node-version", displayName: "Node version", category: "environment", tier: 1,
  capabilities: [], defaultProps: {},
  render: (_p, { system }) => (system?.nodeVersion ? [span(`node ${system.nodeVersion}`)] : []),
});

export const pythonVersionTile = t<Record<string, never>>({
  id: "python-version", displayName: "Python version", category: "environment", tier: 1,
  capabilities: [], defaultProps: {},
  render: (_p, { system }) => (system?.pythonVersion ? [span(`py${system.pythonVersion}`)] : []),
});

export const hostnameTile = t<Record<string, never>>({
  id: "hostname", displayName: "Hostname", category: "environment", tier: 1,
  capabilities: [], defaultProps: {},
  render: (_p, { system }) => (system?.hostname ? [span(system.hostname)] : []),
});

export const batteryTile = t<{ warnAt: number }>({
  id: "battery", displayName: "Battery", category: "environment", tier: 2,
  capabilities: [], defaultProps: { warnAt: 20 },
  render(props, { system }) {
    const b = system?.battery;
    if (!b) return [];
    const fg = b.charging ? "#87d787" : b.percent <= props.warnAt ? "#ff5f5f" : undefined;
    return [span(`${b.percent}%${b.charging ? "+" : ""}`, { fg })];
  },
});
