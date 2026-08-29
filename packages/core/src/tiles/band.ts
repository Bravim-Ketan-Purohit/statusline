import { span, type Span } from "../spans.js";
import type { TileModule } from "./types.js";
import { fillColorAt, DEFAULT_FILL, type Fill } from "../fill.js";

/**
 * A band of pure fill, drawn with the upper-half-block U+2580.
 *
 * The glyph's foreground is the upper pixel and its background the lower one,
 * so one text row carries two pixel rows. That is how a baked image reaches a
 * terminal at usable resolution: the tile's own fill is sampled per cell and
 * emitted as ordinary spans, so it travels through the same solver, the same
 * width math, and the same adapters as any other tile.
 */
export const bandTile: TileModule<{ width: number }> = {
  id: "fill-band",
  displayName: "Fill band",
  category: "layout",
  tier: 1,
  capabilities: [],
  defaultProps: { width: 24 },
  render(props, data, mode) {
    // The fill lives on style, which tiles do not receive; the host copies it
    // onto custom under this key so the band can read it.
    const raw = data.custom?.["fill-band"];
    let fill: Fill | undefined;
    try { fill = raw ? (JSON.parse(raw) as Fill) : undefined; } catch { fill = undefined; }
    if (!fill || fill.kind === "none") return [];

    const w = Math.max(1, Math.min(200, mode === "compact" ? Math.ceil(props.width / 2) : props.width));
    const now = (data.local.now ?? new Date()).getTime();
    const seed = data.cc.session_id ?? "";
    const out: Span[] = [];
    for (let x = 0; x < w; x++) {
      const top = fillColorAt(fill, x, 0, w, 2, now, seed) || "#000000";
      const bottom = fillColorAt(fill, x, 1, w, 2, now, seed) || "#000000";
      out.push(span("▀", { fg: top, bg: bottom }));
    }
    return out;
  },
};

export const BAND_DEFAULT_FILL: Fill = { ...DEFAULT_FILL, kind: "gradient", animated: true };
