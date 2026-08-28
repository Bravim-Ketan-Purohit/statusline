import { useMemo } from "react";
import { renderWeb, type Config, type RuntimeData } from "@statusline/core";

/**
 * Drawing schedule. One row per layer, showing how many parts survive at that
 * width and how many the solver drops. This is the responsive overview the
 * width handle can only reveal one position at a time.
 */
const PEN = ["--pen-xs", "--pen-sm", "--pen-md", "--pen-lg", "--pen-xl", "--pen-2xl"];

export function Schedule({
  cfg, data, activeId, onPick,
}: {
  cfg: Config;
  data: Omit<RuntimeData, "columns">;
  activeId: string;
  onPick: (cols: number) => void;
}) {
  const rows = useMemo(() =>
    cfg.breakpoints.map((bp, i) => {
      const cols = Math.max(bp.minCols || 28, 28);
      const r = renderWeb(cfg, { ...data, columns: cols });
      const all = r.rows.flatMap((x) => x.tiles);
      const drawn = all.filter((t) => !t.ghost).length;
      return {
        id: bp.id, cols, pen: PEN[i] ?? "--pen-md",
        drawn, dropped: all.length - drawn,
        width: r.rows.reduce((m, x) => Math.max(m, x.width), 0),
      };
    }), [cfg, data]);

  return (
    <section className="schedule" aria-label="Layer schedule">
      <table>
        <caption>Layer schedule</caption>
        <thead>
          <tr><th scope="col">Layer</th><th scope="col">Col</th><th scope="col">Drawn</th>
              <th scope="col">Dropped</th><th scope="col">Used</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-active={r.id === activeId}
                onClick={() => onPick(r.cols)} tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter") && onPick(r.cols)}>
              <th scope="row"><span className="lay"><span className="pen-chip" style={{ background: `var(${r.pen})` }} />{r.id}</span></th>
              <td>{r.cols}</td>
              <td>{r.drawn}</td>
              <td data-warn={r.dropped > 0}>{r.dropped || "—"}</td>
              <td>{r.width}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
