import { useLayoutEffect, useRef, useState } from "react";
import type { WebRender, WebTile, Config } from "@statusline/core";
import { IconDimension } from "./Icons";

/**
 * The specimen is the real render on the user's own terminal ground: every
 * position here came from core's layout solver.
 *
 * Two builder-only affordances sit on top. A tile whose data is absent draws
 * as a labelled placeholder rather than nothing, because an invisible tile
 * cannot be styled. And a drag shows an insertion caret at the slot it would
 * land in, so a drop is predictable instead of an append into the void.
 */

export interface DropTarget { row: number; index: number }

function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(r1!, r2!)}${c(g1!, g2!)}${c(b1!, b2!)}`;
}

function TileSpans({ tile, phase }: { tile: WebTile; phase: number }) {
  const grad = tile.gradient;
  return (
    <>
      <span style={{ background: tile.bg, color: tile.fg }}> </span>
      {tile.spans.map((s, i) => {
        if (grad) {
          const chars = [...s.text];
          return chars.map((ch, j) => {
            const base = chars.length > 1 ? j / (chars.length - 1) : 0;
            const t = grad.animated ? Math.abs(((base + phase) % 2) - 1) : base;
            return <span key={`${i}-${j}`} style={{ background: tile.bg, color: mix(grad.from, grad.to, t) }}>{ch}</span>;
          });
        }
        return (
          <span key={i} style={{
            background: s.bg ?? tile.bg, color: s.fg ?? tile.fg,
            fontWeight: s.bold ? 700 : undefined, opacity: s.dim ? 0.62 : undefined,
          }}>{s.text}</span>
        );
      })}
      <span style={{ background: tile.bg, color: tile.fg }}> </span>
    </>
  );
}

export function Specimen({
  render, cfg, selected, onSelect, onSelectSheet, columns, phase, drop, onDropAt,
}: {
  render: WebRender;
  cfg: Config;
  selected: string | null;
  onSelect: (id: string) => void;
  onSelectSheet: () => void;
  columns: number;
  phase: number;
  drop: DropTarget | null;
  onDropAt: (t: DropTarget | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<number[]>([]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const base = el.getBoundingClientRect();
    const xs: number[] = [];
    el.querySelectorAll<HTMLElement>("[data-tile]").forEach((t) => {
      const r = t.getBoundingClientRect();
      xs.push(r.left - base.left, r.right - base.left);
    });
    setMarks([...new Set(xs.map((x) => Math.round(x)))].sort((a, b) => a - b));
  }, [render, columns, phase]);

  const anyTiles = render.rows.some((r) => r.tiles.length);
  const bgGrad = cfg.theme.terminalGradient;
  const ground = bgGrad
    ? `linear-gradient(90deg, ${bgGrad.animated
        ? mix(bgGrad.from, bgGrad.to, Math.abs((phase % 2) - 1))
        : bgGrad.from}, ${bgGrad.to})`
    : cfg.theme.terminalBg;

  return (
    <div className="specimen-wrap" ref={wrapRef}>
      <svg className="witness" aria-hidden="true">
        {marks.map((x, i) => (
          <line key={i} x1={x} y1={0} x2={x} y2={14}
                stroke="var(--dim)" strokeWidth="1" strokeDasharray="2 3" />
        ))}
      </svg>
      <div
        className="specimen"
        style={{ background: ground }}
        onClick={(e) => { if (e.target === e.currentTarget) onSelectSheet(); }}
      >
        {!anyTiles && (
          <div className="field-empty" style={{ color: "#8b8b85" }}>
            <IconDimension size={22} />
            <p>Nothing to dimension yet. Drag a part in from the left, or click one to add it.</p>
          </div>
        )}
        {render.rows.map((row, ri) => (
          <div
            key={row.rowId}
            className="spec-row"
            data-droprow={ri}
            onClick={(e) => { if (e.target === e.currentTarget) onSelectSheet(); }}
          >
            {row.tiles.map((t, i) => (
              <span key={t.tileId} className="slot">
                {drop && drop.row === ri && drop.index === i && <i className="drop-caret" aria-hidden="true" />}
                <span
                  data-tile
                  data-ghost={t.ghost}
                  data-empty={t.empty}
                  data-selected={selected === t.tileId}
                  className="spec-tile"
                  role="button"
                  tabIndex={0}
                  title={t.empty ? `${t.type}: no data in this preview — hidden in a real terminal` : t.type}
                  aria-label={`${t.type}${t.ghost ? ", dropped at this width" : ""}${t.empty ? ", no data" : ""}`}
                  onClick={(e) => { e.stopPropagation(); onSelect(t.tileId); }}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(t.tileId))}
                >
                  <TileSpans tile={t} phase={phase} />
                </span>
                {i < row.tiles.length - 1 && <span>{" ".repeat(render.gap)}</span>}
                {drop && drop.row === ri && drop.index === i + 1 && <i className="drop-caret" aria-hidden="true" />}
              </span>
            ))}
            {!row.tiles.length && drop?.row === ri && <i className="drop-caret" aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}
