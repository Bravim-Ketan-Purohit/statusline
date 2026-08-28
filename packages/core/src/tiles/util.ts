export const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : `${Math.round(n / 1000)}k`;

export function humanDelta(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h${String(m).padStart(2, "0")}m`;
  return m ? `${m}m` : `${s}s`;
}

/** Stable per-window pick. An unseeded choice re-rolls on every render. */
export function seeded<T>(items: T[], mode: "session" | "hourly" | "daily", sessionId: string): T | null {
  if (!items.length) return null;
  const seed =
    mode === "hourly" ? Math.floor(Date.now() / 3_600_000)
    : mode === "daily" ? Math.floor(Date.now() / 86_400_000)
    : [...(sessionId || "x")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  let x = (typeof seed === "number" ? seed : 7) >>> 0;
  x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0;
  return items[x % items.length]!;
}
