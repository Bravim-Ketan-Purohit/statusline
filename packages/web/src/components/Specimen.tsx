import { useLayoutEffect, useRef, useState } from "react";
import type { WebRender, WebTile, Config } from "@statusline/core";
import { IconDimension } from "./Icons";

/**
 * The specimen is the real render on the user's own terminal ground.
 * Every tile position here came from core's layout solver, so what is drawn
 * is what the terminal prints -- including the ghosts, which are the tiles
 * the solver dropped at this width.
 */

function TileSpans({ tile }: { tile: WebTile }) {
  const pad = " ";
  return (
    <>
      <span style={{ background: tile.bg, color: tile.fg }}>{pad}</span>
      {tile.spans.map((s, i) => {
        const grad = tile.gradient;
        if (grad) {
          const chars = [...s.text];
          return chars.map((ch, j) => {
            const t = chars.length > 1 ? j / (chars.length - 1) : 0;
            return (
              <span key={`${i}-${j}`} style={{ background: tile.bg, color: mix(grad.from, grad.to, t) }}>{ch}</span>
            );
          });
        }
        return (
          <span key={i} style={{
            background: s.bg ?? tile.bg,
            color: s.fg ?? tile.fg,
            fontWeight: s.bold ? 700 : undefined,
            opacity: s.dim ? 0.62 : undefined,
          }}>{s.text}</span>
        );
      })}
      <span style={{ background: tile.bg, color: tile.fg }}>{pad}</span>
    </>
  );
}

function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(r1!, r2!)}${c(g1!, g2!)}${c(b1!, b2!)}`;
}

export function Specimen({
  render, cfg, selected, onSelect, columns,
}: {
  render: WebRender;
  cfg: Config;
  selected: string | null;
  onSelect: (id: string) => void;
  columns: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<number[]>([]);

  // Witness lines rise from every tile boundary to the dimension line above.
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
  }, [render, columns]);

  const anyTiles = render.rows.some((r) => r.tiles.length);

  return (
    <div className="specimen-wrap" ref={wrapRef}>
      <svg className="witness" aria-hidden="true">
        {marks.map((x, i) => (
          <line key={i} x1={x} y1={0} x2={x} y2={14}
                stroke="var(--dim)" strokeWidth="1" strokeDasharray="2 3" />
        ))}
      </svg>
      <div className="specimen" style={{ background: cfg.theme.terminalBg }}>
        {!anyTiles && (
          <div className="field-empty" style={{ color: "#8b8b85" }}>
            <IconDimension size={22} />
            <p>Nothing to dimension yet. Drag a part from the list on the left, or apply a bundle, and it will be drawn here at true size.</p>
          </div>
        )}
        {render.rows.map((row) => (
          <div className="spec-row" key={row.rowId}>
            {row.tiles.map((t, i) => (
              <span
                key={t.tileId}
                data-tile
                data-ghost={t.ghost}
                data-selected={selected === t.tileId}
                className="spec-tile"
                role="button"
                tabIndex={0}
                aria-label={`${t.type}${t.ghost ? ", dropped at this width" : ""}`}
                onClick={() => onSelect(t.tileId)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(t.tileId))}
              >
                <TileSpans tile={t} />
                {i < row.tiles.length - 1 && <span>{" ".repeat(render.gap)}</span>}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
