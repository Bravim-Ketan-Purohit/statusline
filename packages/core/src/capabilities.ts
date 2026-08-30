import type { Config } from "./schema.js";

/**
 * What each render target can actually do.
 *
 * The builder must never let you design something that silently does not
 * render. Every control that can be unavailable asks here, and shows the
 * reason rather than greying out mutely.
 */

export type Target = "claudeCode" | "tmux" | "web";

export type Feature =
  | "click" | "osc8Link" | "overline" | "underlineColor"
  | "truecolor" | "nerdFontGlyph" | "imageFill" | "animatedFill"
  | "drill" | "multiRow";

/** A verdict, distinct from a tile's `Capability` requirement flag. */
export interface CapabilityVerdict { ok: boolean; reason?: string }

const OK: CapabilityVerdict = { ok: true };

export const TARGETS: { id: Target; name: string; note: string }[] = [
  { id: "claudeCode", name: "Claude Code", note: "Captured stdout. Multi-row, OSC 8 links, no click." },
  { id: "tmux", name: "tmux", note: "One line. Real click dispatch, no hyperlinks." },
  { id: "web", name: "Web preview", note: "The builder canvas. Everything works here." },
];

export function canDo(target: Target, feature: Feature, cfg: Config): CapabilityVerdict {
  switch (feature) {
    case "click":
      if (target === "tmux") return OK;
      if (target === "web") return OK;
      return cfg.daemon.enabled
        ? { ok: true, reason: "Reaches the daemon through an OSC 8 link, not a real click." }
        : { ok: false, reason: "Claude Code captures stdout, so it has no click events. Enable the daemon and the tile becomes an OSC 8 link to it." };

    case "osc8Link":
      if (target === "tmux") return { ok: false, reason: "tmux does not pass OSC 8 through; the link text still renders." };
      return OK;

    case "drill":
      if (target === "tmux") return OK;
      return { ok: false, reason: "Only tmux can open a popup. Claude Code has no mechanism for it." };

    case "multiRow":
      if (target === "tmux") return { ok: false, reason: "tmux status is one line; rows are joined with a separator." };
      return OK;

    case "overline":
    case "underlineColor":
      if (target === "tmux") return { ok: false, reason: "tmux does not forward SGR 53 or 58." };
      if (target === "web") return OK;
      return { ok: true, reason: "Needs a modern terminal (Kitty, WezTerm, iTerm2, Ghostty). Elsewhere it is ignored, not garbled." };

    case "truecolor":
      return cfg.theme.colorMode === "truecolor"
        ? OK
        : { ok: true, reason: `Colour mode is ${cfg.theme.colorMode}; the preview quantizes to match.` };

    case "nerdFontGlyph":
      return cfg.theme.font.nerdFont
        ? OK
        : { ok: false, reason: "Nerd Font is off in the theme, so these glyphs would render as boxes." };

    case "imageFill":
      if (target === "tmux") return { ok: false, reason: "A baked image needs per-cell backgrounds tmux will not carry through a format string." };
      return { ok: true, reason: "Lands near 96x8 with half-blocks: a colour field, not a photograph." };

    case "animatedFill":
      if (target === "web") return OK;
      return {
        ok: true,
        reason: target === "tmux"
          ? "Advances once per status-interval, which floors at 1 second."
          : "Advances once per refreshInterval, which floors at 1 second. A slow pulse, not a flow.",
      };

    default:
      return OK;
  }
}
