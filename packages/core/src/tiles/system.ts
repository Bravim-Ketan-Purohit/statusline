import { span, type Span } from "../spans.js";
import type { TileModule } from "./types.js";
import { renderBar, barColor } from "./contextBar.js";

/**
 * Sampled OS metrics.
 *
 * Every one of these renders nothing when `metrics` is absent. That is not
 * only the missing-field rule: the renderer deliberately treats a metrics file
 * older than 30s as absent, because a stale CPU percentage presented as
 * current is worse than no CPU percentage at all.
 */
const t = <P,>(m: TileModule<P>) => m;

const human = (bytes: number | undefined): string => {
  if (bytes === undefined) return "";
  const u = ["B", "K", "M", "G", "T"];
  let v = bytes, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return (v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)) + u[i];
};

const pct = (n: number) => `${String(Math.round(n)).padStart(3, " ")}%`;

function barred(value: number, width: number, mode: string, showBar: boolean): Span[] {
  const out: Span[] = [];
  if (showBar && mode === "full") {
    const { filled, empty } = renderBar(value, width);
    out.push(span(filled, { fg: barColor(value) }), span(empty, { fg: "#4e4e4e" }), span(" "));
  }
  out.push(span(pct(value), { fg: barColor(value) }));
  return out;
}

export const cpuTile = t<{ width: number; showBar: boolean }>({
  id: "cpu", displayName: "CPU usage", category: "environment", tier: 3,
  capabilities: [], defaultProps: { width: 8, showBar: true },
  render: (p, d, mode) =>
    d.metrics?.cpuPct === undefined ? [] : barred(d.metrics.cpuPct, p.width, mode, p.showBar),
});

export const memoryTile = t<{ showTotal: boolean }>({
  id: "memory", displayName: "Memory usage", category: "environment", tier: 3,
  capabilities: [], defaultProps: { showTotal: true },
  render(p, d, mode) {
    const m = d.metrics;
    if (m?.memUsed === undefined || !m.memTotal) return [];
    const usedPct = (m.memUsed / m.memTotal) * 100;
    const out = [span(human(m.memUsed), { fg: barColor(usedPct) })];
    if (p.showTotal && mode === "full") out.push(span("/" + human(m.memTotal), { dim: true }));
    return out;
  },
});

export const swapTile = t<Record<string, never>>({
  id: "swap", displayName: "Swap in use", category: "environment", tier: 3,
  capabilities: [], defaultProps: {},
  // Hidden at zero: swap only matters once it is being used.
  render: (_p, d) => (!d.metrics?.swapUsed ? [] : [span(human(d.metrics.swapUsed))]),
});

export const diskTile = t<{ width: number; showBar: boolean }>({
  id: "disk", displayName: "Disk used", category: "environment", tier: 3,
  capabilities: [], defaultProps: { width: 8, showBar: false },
  render: (p, d, mode) =>
    d.metrics?.diskPct === undefined ? [] : barred(d.metrics.diskPct, p.width, mode, p.showBar),
});

export const loadTile = t<Record<string, never>>({
  id: "load", displayName: "Load average", category: "environment", tier: 3,
  capabilities: [], defaultProps: {},
  render: (_p, d) => (d.metrics?.load1 === undefined ? [] : [span(d.metrics.load1.toFixed(2))]),
});

export const networkTile = t<Record<string, never>>({
  id: "network", displayName: "Network throughput", category: "environment", tier: 3,
  capabilities: [], defaultProps: {},
  render(_p, d, mode) {
    const m = d.metrics;
    if (m?.netRx === undefined) return [];
    const down = span(`↓${human(m.netRx)}`, { fg: "#5fafd7" });
    if (mode === "compact") return [down];
    return [down, span(" "), span(`↑${human(m.netTx ?? 0)}`, { fg: "#87d787" })];
  },
});

export const gpuTile = t<{ width: number; showBar: boolean }>({
  id: "gpu", displayName: "GPU usage", category: "environment", tier: 3,
  // No unprivileged GPU API on macOS, so this simply never has data there.
  capabilities: [], defaultProps: { width: 8, showBar: true },
  render: (p, d, mode) =>
    d.metrics?.gpuPct === undefined ? [] : barred(d.metrics.gpuPct, p.width, mode, p.showBar),
});

export const vramTile = t<Record<string, never>>({
  id: "vram", displayName: "VRAM usage", category: "environment", tier: 3,
  capabilities: [], defaultProps: {},
  render(_p, d, mode) {
    const m = d.metrics;
    if (m?.vramUsed === undefined || !m.vramTotal) return [];
    const p = (m.vramUsed / m.vramTotal) * 100;
    const out = [span(human(m.vramUsed), { fg: barColor(p) })];
    if (mode === "full") out.push(span("/" + human(m.vramTotal), { dim: true }));
    return out;
  },
});
