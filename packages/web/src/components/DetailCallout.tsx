import type { Config, Tile } from "@statusline/core";
import { getTile } from "@statusline/core";
import { IconLocked, IconTrash } from "./Icons";

/**
 * Detail callout. Cut faces: the tile's measured internals are exposed, not
 * only its settings. Controls the active target cannot honour are disabled
 * with the reason stated -- never a silent no-op discovered in a terminal.
 */

type Tri = "inherit" | "on" | "off";

export function DetailCallout({
  cfg, tile, bpId, measured, onChange, onDelete,
}: {
  cfg: Config;
  tile: Tile | null;
  bpId: string;
  measured: { width: number; ghost: boolean } | null;
  onChange: (next: Tile) => void;
  onDelete: () => void;
}) {
  if (!tile) {
    return (
      <aside className="callout" aria-label="Detail callout">
        <h2 className="region-head">Detail</h2>
        <div className="field-empty">
          <p>Select a part in the drawing to open its detail. Its measured width, its layer overrides, and its pens appear here.</p>
        </div>
      </aside>
    );
  }

  const mod = getTile(tile.type);
  const ov = (tile.responsive as Record<string, any>)[bpId];
  const triOf = (k: "hidden" | "compact"): Tri =>
    ov && typeof ov === "object" && typeof ov[k] === "boolean" ? (ov[k] ? "on" : "off") : "inherit";

  const setTri = (k: "hidden" | "compact", v: Tri) => {
    const r = { ...(tile.responsive as Record<string, any>) };
    const cur = { ...(typeof r[bpId] === "object" ? r[bpId] : {}) };
    if (v === "inherit") delete cur[k]; else cur[k] = v === "on";
    Object.keys(cur).length ? (r[bpId] = cur) : delete r[bpId];
    onChange({ ...tile, responsive: r as Tile["responsive"] });
  };

  const setStyle = (patch: Partial<Tile["style"]>) =>
    onChange({ ...tile, style: { ...tile.style, ...patch } });

  // Claude Code captures stdout; only tmux can dispatch a command from a click.
  const tmuxOn = cfg.targets.tmux.enabled;
  const actionBytes = new TextEncoder().encode(tile.action ?? "").length;

  return (
    <aside className="callout" data-linked="true" aria-label="Detail callout">
      <h2 className="region-head">
        Detail — {mod?.displayName ?? tile.type}
        <span className="n">{measured ? `${measured.width} col` : "not drawn"}</span>
      </h2>
      <div className="callout-body">
        {measured?.ghost && (
          <div className="field-row"><div className="cap-note" style={{ color: "var(--pen-xs)" }}>
            <IconLocked size={13} />
            <span>Dropped at this width by priority {(tile.responsive as any).priority}. It is drawn as a ghost cell so the gap is visible.</span>
          </div></div>
        )}

        <div className="section-rule">Annotation</div>
        <div className="field-row">
          <label htmlFor="d-glyph">Glyph</label>
          <input id="d-glyph" type="text" value={tile.style.glyph} maxLength={4}
                 onChange={(e) => setStyle({ glyph: e.target.value })} />
        </div>
        <div className="field-row">
          <label htmlFor="d-label">Label</label>
          <input id="d-label" type="text" value={tile.style.label}
                 onChange={(e) => setStyle({ label: e.target.value })} />
        </div>

        <div className="section-rule">Pens</div>
        <div className="field-row">
          <label htmlFor="d-bg">Ground</label>
          <div className="swatch-row">
            <span className="swatch" style={{ background: tile.style.bg ?? "transparent" }}>
              <input id="d-bg" type="color" value={tile.style.bg ?? "#005f87"}
                     onChange={(e) => setStyle({ bg: e.target.value })} />
            </span>
            <code style={{ fontSize: 11, color: "var(--dim)" }}>{tile.style.bg ?? "none"}</code>
          </div>
        </div>
        <div className="field-row">
          <label htmlFor="d-fg">Ink</label>
          <div className="swatch-row">
            <span className="swatch" style={{ background: tile.style.fg ?? "transparent" }}>
              <input id="d-fg" type="color" value={tile.style.fg ?? "#d7ffff"}
                     onChange={(e) => setStyle({ fg: e.target.value })} />
            </span>
            <code style={{ fontSize: 11, color: "var(--dim)" }}>{tile.style.fg ?? "none"}</code>
          </div>
        </div>
        <div className="field-row">
          <label htmlFor="d-grad">Gradient</label>
          <div className="swatch-row">
            <input id="d-grad" type="checkbox" checked={!!tile.style.gradient}
                   onChange={(e) => setStyle({ gradient: e.target.checked
                     ? { from: tile.style.bg ?? "#005f87", to: "#5f0087" } : null })} />
            {tile.style.gradient && (
              <>
                <span className="swatch" style={{ background: tile.style.gradient.from }}>
                  <input type="color" value={tile.style.gradient.from}
                         onChange={(e) => setStyle({ gradient: { ...tile.style.gradient!, from: e.target.value } })} />
                </span>
                <span className="swatch" style={{ background: tile.style.gradient.to }}>
                  <input type="color" value={tile.style.gradient.to}
                         onChange={(e) => setStyle({ gradient: { ...tile.style.gradient!, to: e.target.value } })} />
                </span>
              </>
            )}
          </div>
        </div>

        <div className="section-rule">Layer {bpId}</div>
        <div className="field-row">
          <label>Hidden</label>
          <TriControl value={triOf("hidden")} onChange={(v) => setTri("hidden", v)} />
        </div>
        <div className="field-row">
          <label>Compact</label>
          <TriControl value={triOf("compact")} onChange={(v) => setTri("compact", v)} />
        </div>
        <div className="field-row">
          <div className="cap-note">
            <span>Inherit takes the value from the next smaller layer. An empty override is not a reset.</span>
          </div>
        </div>
        <div className="field-row">
          <label htmlFor="d-prio">Priority</label>
          <input id="d-prio" type="number" min={1} max={9}
                 value={(tile.responsive as any).priority ?? 5}
                 onChange={(e) => onChange({ ...tile, responsive: {
                   ...(tile.responsive as any), priority: Number(e.target.value) } as Tile["responsive"] })} />
        </div>
        <div className="field-row">
          <div className="cap-note"><span>Higher numbers are dropped first when the row runs out of columns.</span></div>
        </div>

        <div className="section-rule">Action</div>
        <div className="field-row">
          <label htmlFor="d-action">Action id</label>
          <input id="d-action" type="text" value={tile.action ?? ""} disabled={!tmuxOn}
                 placeholder={tmuxOn ? "play_pause" : "tmux target off"}
                 onChange={(e) => onChange({ ...tile, action: e.target.value || null })} />
        </div>
        <div className="field-row">
          <div className="cap-note">
            <IconLocked size={13} />
            <span>
              {!tmuxOn
                ? "Claude Code captures stdout, so a click can only open an OSC 8 link there. Enable the tmux target to dispatch a command."
                : `tmux passes this through range=user, capped at 15 bytes. ${actionBytes}/15 used.`}
            </span>
          </div>
        </div>

        <div className="field-row" style={{ paddingTop: 14 }}>
          <button className="btn" onClick={onDelete} style={{ gridColumn: "1 / -1" }}>
            <IconTrash size={13} /> Remove part
          </button>
        </div>
      </div>
    </aside>
  );
}

function TriControl({ value, onChange }: { value: Tri; onChange: (v: Tri) => void }) {
  const opts: Tri[] = ["inherit", "off", "on"];
  return (
    <div className="tri" role="group">
      {opts.map((o) => (
        <button key={o} aria-pressed={value === o} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}
