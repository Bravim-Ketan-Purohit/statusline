import { allTiles } from "@statusline/core";
import type { Config } from "@statusline/core";
import { BUNDLES, applyBundle, type Bundle } from "../lib/bundles";
import { IconPart } from "./Icons";

const CATEGORY_ORDER = ["session", "git", "environment", "personal", "media", "layout"] as const;

export function PartsList({
  cfg, onAdd, onBundle, safety, onSafety,
}: {
  cfg: Config;
  onAdd: (type: string) => void;
  onBundle: (b: Bundle) => void;
  safety: boolean;
  onSafety: (v: boolean) => void;
}) {
  const used = new Set(cfg.rows.flatMap((r) => r.tiles.map((t) => t.type)));
  const mods = allTiles();
  const byCat = CATEGORY_ORDER
    .map((c) => ({ cat: c, items: mods.filter((m) => m.category === c) }))
    .filter((g) => g.items.length);

  let n = 0;
  return (
    <section className="parts" aria-label="Parts list">
      <h2 className="region-head">Parts list <span className="n">{mods.length} avail</span></h2>
      <div className="bom">
        {byCat.map((g) => (
          <div key={g.cat}>
            <div className="bom-group">{g.cat}</div>
            {g.items.map((m) => {
              n += 1;
              const no = String(n).padStart(2, "0");
              return (
                <button
                  key={m.id}
                  className="part"
                  data-used={used.has(m.id)}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/tile-type", m.id)}
                  onClick={() => onAdd(m.id)}
                  title={`Add ${m.displayName}`}
                >
                  <span className="no">{no}</span>
                  <span className="nm">{m.displayName}</span>
                  <span className="tier">T{m.tier}</span>
                </button>
              );
            })}
          </div>
        ))}

        <div className="section-rule">Bundles</div>
        {BUNDLES.map((b) => (
          <button key={b.id} className="part" onClick={() => onBundle(b)} title={b.note}>
            <span className="no"><IconPart size={13} /></span>
            <span className="nm">{b.name}</span>
            <span className="tier">{b.tiles.length}</span>
          </button>
        ))}
        <label className="field-row" style={{ gridTemplateColumns: "auto 1fr", paddingTop: 10 }}>
          <input type="checkbox" checked={safety} onChange={(e) => onSafety(e.target.checked)} />
          <span style={{ fontSize: 11, color: "var(--ink-2)", textTransform: "none", letterSpacing: 0 }}>
            Append safety parts to every bundle
          </span>
        </label>
      </div>
    </section>
  );
}
