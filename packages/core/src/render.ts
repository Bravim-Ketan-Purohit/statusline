import type { Config } from "./schema.js";
import type { RuntimeData } from "./runtime.js";
import { buildRow, fitRow } from "./layout.js";
import { renderRowAnsi, type AnsiOptions } from "./adapters/ansi.js";
import { renderRowTmux } from "./adapters/tmux.js";

const STYLE_OPTS: Record<string, AnsiOptions> = {
  pills: { pad: 1, gap: 1 },
  powerline: { pad: 1, gap: 0 },
  plain: { pad: 0, gap: 3 },
};

/**
 * The one entry point every target shares. Returns finished lines.
 * A throwing tile is already contained in buildRow; this wrapper is the last
 * line of defence -- the CLI adds a model-name fallback on top.
 */
export function renderAnsi(cfg: Config, data: RuntimeData): string[] {
  const style = cfg.targets.claudeCode.style;
  const opts = STYLE_OPTS[style] ?? STYLE_OPTS.pills!;
  const cols = data.columns;
  const lines: string[] = [];

  for (let i = 0; i < cfg.rows.length; i++) {
    const built = buildRow(cfg, i, data, cols);
    if (!built.length) continue;
    const { kept } = fitRow(built, cols, opts.gap, opts.pad);
    if (!kept.length) continue;
    lines.push(renderRowAnsi(kept, cfg, opts));
    if (lines.length >= cfg.targets.claudeCode.maxRows) break;
  }
  return lines;
}


/**
 * tmux target. Same rows, same solver, same drop decisions -- only the escape
 * vocabulary differs. tmux is one line, so rows join with a separator.
 */
export function renderTmux(cfg: Config, data: RuntimeData): string {
  const opts = STYLE_OPTS[cfg.targets.claudeCode.style] ?? STYLE_OPTS.pills!;
  const cols = cfg.targets.tmux.maxWidth || data.columns;
  const out: string[] = [];
  for (let i = 0; i < cfg.rows.length; i++) {
    const built = buildRow(cfg, i, data, cols);
    if (!built.length) continue;
    const { kept } = fitRow(built, cols, opts.gap, opts.pad);
    if (kept.length) out.push(renderRowTmux(kept, cfg, opts.pad, opts.gap));
  }
  return out.join(" ");
}
