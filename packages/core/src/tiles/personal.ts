import { span, type Span } from "../spans.js";
import type { TileModule } from "./types.js";
import { seeded } from "./util.js";

const t = <P,>(m: TileModule<P>) => m;
type Rotate = "session" | "hourly" | "daily";

export const verseTile = t<{ rotate: Rotate; lang: "en" | "sa" | "both"; themes: string[] }>({
  id: "verse", displayName: "Scripture verse", category: "personal", tier: 1,
  capabilities: [], defaultProps: { rotate: "session", lang: "en", themes: [] },
  render(props, { cc, personal }, mode) {
    let items = personal?.verses ?? [];
    if (!items.length) return [];
    if (props.themes.length) {
      const f = items.filter((v) => v.theme && props.themes.includes(v.theme));
      if (f.length) items = f;
    }
    const v = seeded(items, props.rotate, cc.session_id ?? "");
    if (!v) return [];
    const body =
      props.lang === "sa" ? (v.sa || v.en || "")
      : props.lang === "both" ? `${v.sa ?? ""} — ${v.en ?? ""}`.trim()
      : (v.en || "");
    if (!body) return [];
    // The citation is never trimmed; the layout solver trims by dropping tiles.
    return mode === "compact"
      ? [span(v.src, { dim: true })]
      : [span(v.src, { dim: true }), span("  "), span(body)];
  },
});

export const trackTile = t<{ rotate: Rotate }>({
  id: "track", displayName: "Playlist track", category: "personal", tier: 1,
  capabilities: [], defaultProps: { rotate: "session" },
  render(props, { cc, personal }, mode) {
    const items = personal?.tracks ?? [];
    const tr = seeded(items, props.rotate, cc.session_id ?? "");
    if (!tr?.title) return [];
    const out = [span(tr.title, { link: tr.url })];
    if (mode === "full" && tr.artist) out.push(span(" · ", { dim: true }), span(tr.artist));
    return out;
  },
});

export const skillsTile = t<{ max: number }>({
  id: "skills", displayName: "Suggested skills", category: "personal", tier: 2,
  capabilities: ["needsGit"], defaultProps: { max: 3 },
  render(props, { personal }, mode) {
    const recs = (personal?.skills ?? []).slice(0, mode === "compact" ? 1 : props.max);
    if (!recs.length) return [];
    const out: Span[] = [];
    recs.forEach((r, i) => {
      if (i) out.push(span(" · ", { dim: true }));
      out.push(span(r));
    });
    return out;
  },
});
