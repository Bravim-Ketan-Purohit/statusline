import type { Config, TileStyle } from "../schema.js";
import type { ResolvedTile } from "../layout.js";
import type { Span } from "../spans.js";
import { resolveColor } from "./ansi.js";
import { quantize } from "./web.js";

/**
 * tmux format strings. Unlike Claude Code, tmux dispatches real commands: a
 * tile with an action renders inside #[range=user|X] ... #[norange], and
 * MouseDown1Status hands X back through #{mouse_status_range}.
 *
 * X is capped at 15 bytes by tmux; the schema validates that, so anything
 * arriving here is already within budget.
 */

/** tmux treats #, and in some contexts }, as syntax. Escape before emitting. */
export function escapeTmux(s: string): string {
  return s.replace(/#/g, "##");
}

function style(cfg: Config, fg?: string, bg?: string, bold?: boolean, dim?: boolean): string {
  const parts: string[] = [];
  const f = resolveColor(fg, cfg), b = resolveColor(bg, cfg);
  if (f) parts.push(`fg=${quantize(f, cfg.theme.colorMode)}`);
  if (b) parts.push(`bg=${quantize(b, cfg.theme.colorMode)}`);
  if (bold) parts.push("bold");
  if (dim) parts.push("dim");
  return parts.length ? `#[${parts.join(",")}]` : "";
}

function spanTmux(s: Span, cfg: Config, base: string): string {
  const own = s.danger
    ? style(cfg, cfg.theme.dangerColor, s.bg, true, false)
    : style(cfg, s.fg, s.bg, s.bold, s.dim);
  // tmux has no OSC 8; the link text still renders, the URL is simply dropped.
  return own ? own + escapeTmux(s.text) + "#[none]" + base : escapeTmux(s.text);
}

export function renderTileTmux(rt: ResolvedTile, cfg: Config, pad: number): string {
  const st: TileStyle = rt.style;
  const base = style(cfg, st.fg, st.bg);
  const padStr = " ".repeat(pad);
  const body = rt.spans.map((s) => spanTmux(s, cfg, base)).join("");
  const inner = `${base}${padStr}${body}${base}${padStr}#[default]`;
  // A tile may carry an action or a drill, never both -- one click, one meaning.
  const range = rt.tile.action ?? (rt.tile.drill ? `d:${rt.tile.drill.id}` : null);
  return range ? `#[range=user|${range}]${inner}#[norange]` : inner;
}

export function renderRowTmux(kept: ResolvedTile[], cfg: Config, pad: number, gap: number,
                              slack = 0): string {
  // tmux right-aligns status-right natively, but a flex tile inside the string
  // still has to be honoured or a left-side bar will not align at all.
  return kept
    .map((t) => renderTileTmux(t, cfg, pad) + (t.flex && slack > 0 ? " ".repeat(slack) : ""))
    .join(" ".repeat(gap));
}

/** The .tmux.conf snippet that makes the clicks actually work. */
export function tmuxConfSnippet(cfg: Config, binary = "statusline"): string {
  const side = cfg.targets.tmux.side;
  const key = side === "left" ? "status-left" : "status-right";
  const lenKey = side === "left" ? "status-left-length" : "status-right-length";
  return `# --- statusline ------------------------------------------------------------
# Mouse support is required for clickable tiles. Note this makes drag-select
# need Shift held down; that is tmux's behaviour, not ours.
set -g mouse on

set -g ${lenKey} ${cfg.targets.tmux.maxWidth}
set -g ${key} "#(${binary} tmux)"
set -g status-interval 5

# range=user|X passes X back through #{mouse_status_range}. No daemon, no HTTP.
# A range beginning "d:" is a drill and opens a popup; anything else is an
# action and runs inline. One binding covers both.
bind -n MouseDown1Status run-shell "${binary} click '#{mouse_status_range}'"

# Right-click a tile for its menu: copy the value, refresh it, or hide it.
bind -n MouseDown3Status display-menu -T "#[align=centre]statusline" \\
  "Refresh now"  r "run-shell '${binary} refresh'" \\
  "Copy value"   c "run-shell '${binary} tmux | tr -d \\"\\\\033\\" | pbcopy 2>/dev/null || true'" \\
  "" \\
  "Reload config" R "source-file ~/.tmux.conf"
# --- end statusline --------------------------------------------------------`;
}
