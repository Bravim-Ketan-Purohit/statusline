import { span } from "../spans.js";
import type { TileModule } from "./types.js";

/**
 * Media controls. On tmux each renders inside a range=user marker for direct
 * dispatch; on Claude Code each becomes an OSC 8 link to the local daemon.
 * The adapters add that wrapping -- the tile only supplies the face.
 */
const t = <P,>(m: TileModule<P>) => m;

const control = (id: string, name: string, glyph: string): TileModule<Record<string, never>> => ({
  id, displayName: name, category: "media", tier: 1,
  capabilities: ["needsDaemon"], defaultProps: {},
  render: () => [span(glyph)],
});

export const playPauseTile = control("media-play", "Play / pause", "⏯");
export const nextTile = control("media-next", "Next track", "⏭");
export const prevTile = control("media-prev", "Previous track", "⏮");
export const volUpTile = control("media-vol-up", "Volume up", "🕪");
export const volDownTile = control("media-vol-down", "Volume down", "🕩");

export const nowPlayingTile = t<Record<string, never>>({
  id: "now-playing", displayName: "Now playing", category: "media", tier: 2,
  capabilities: [], defaultProps: {},
  render(_p, { media }, mode) {
    if (!media?.title) return [];
    const out = [span(media.playing === false ? "⏸" : "♪"), span(" "), span(media.title)];
    if (mode === "full" && media.artist) out.push(span(" · ", { dim: true }), span(media.artist));
    return out;
  },
});
