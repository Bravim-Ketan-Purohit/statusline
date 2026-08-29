import { useRef, useState } from "react";
import { FILL_MODES, DEFAULT_FILL, fillColorAt, type Fill, type FillStop } from "@statusline/core";
import { fillFromFile } from "../lib/imageImport";
import { IconLocked, IconTrash } from "./Icons";

/** A live strip of the fill as the terminal will actually paint it. */
function FillStrip({ fill, phase }: { fill: Fill; phase: number }) {
  const W = 48, H = 4;
  const now = phase * 1000;
  const rows = [];
  for (let y = 0; y < H; y++) {
    const cells = [];
    for (let x = 0; x < W; x++) {
      cells.push(
        <i key={x} style={{ background: fillColorAt(fill, x, y, W, H, now, "preview") || "transparent" }} />
      );
    }
    rows.push(<div className="strip-row" key={y}>{cells}</div>);
  }
  return <div className="fill-strip" aria-hidden="true">{rows}</div>;
}

export function FillEditor({
  fill, phase, onChange, scope,
}: {
  fill: Fill | undefined;
  phase: number;
  onChange: (f: Fill | undefined) => void;
  scope: "sheet" | "tile";
}) {
  const f = fill ?? DEFAULT_FILL;
  const set = (patch: Partial<Fill>) => onChange({ ...f, ...patch });
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const setStop = (i: number, patch: Partial<FillStop>) =>
    set({ stops: f.stops.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const addStop = () => {
    const sorted = [...f.stops].sort((a, b) => a.pos - b.pos);
    const mid = sorted.length > 1 ? (sorted[0]!.pos + sorted[sorted.length - 1]!.pos) / 2 : 0.5;
    set({ stops: [...f.stops, { color: "#ffffff", pos: mid }] });
  };

  const onFile = async (file: File | undefined, style: "ramp" | "image") => {
    if (!file) return;
    setBusy(true); setNote(null);
    try {
      const r = await fillFromFile(file, style, f);
      onChange(r.fill);
      setNote(r.note);
    } catch (e) {
      setNote(`Could not read that file: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  const twoD = ["radial", "conic", "diamond", "spiral", "ripple", "plasma", "wave"].includes(f.mode);

  return (
    <>
      <div className="section-rule">Fill</div>
      <div className="field-row">
        <label htmlFor="f-kind">Kind</label>
        <select id="f-kind" value={f.kind}
                onChange={(e) => {
                  const kind = e.target.value as Fill["kind"];
                  if (kind === "none" && scope === "tile") return onChange(undefined);
                  set({ kind });
                }}>
          <option value="none">none</option>
          <option value="gradient">gradient</option>
          <option value="image">image (baked cells)</option>
        </select>
      </div>

      {f.kind !== "none" && (
        <>
          <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
            <FillStrip fill={f} phase={phase} />
          </div>

          {f.kind === "gradient" && (
            <>
              <div className="field-row">
                <label htmlFor="f-mode">Mode</label>
                <select id="f-mode" value={f.mode}
                        onChange={(e) => set({ mode: e.target.value as Fill["mode"] })}>
                  {FILL_MODES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="field-row">
                <div className="cap-note">
                  <span>{FILL_MODES.find((m) => m.id === f.mode)?.note}</span>
                </div>
              </div>

              <div className="field-row">
                <label>Stops</label>
                <div className="stops">
                  {f.stops.map((s, i) => (
                    <span className="stop" key={i}>
                      <span className="swatch" style={{ background: s.color }}>
                        <input type="color" value={s.color}
                               onChange={(e) => setStop(i, { color: e.target.value })} />
                      </span>
                      <input className="stop-pos" type="number" min={0} max={1} step={0.05}
                             value={Number(s.pos.toFixed(2))}
                             onChange={(e) => setStop(i, { pos: Number(e.target.value) })} />
                      {f.stops.length > 1 && (
                        <button className="stop-x" aria-label="Remove stop"
                                onClick={() => set({ stops: f.stops.filter((_, j) => j !== i) })}>
                          <IconTrash size={11} />
                        </button>
                      )}
                    </span>
                  ))}
                  {f.stops.length < 16 && <button className="btn stop-add" onClick={addStop}>+ stop</button>}
                </div>
              </div>

              {f.mode === "linear" || f.mode === "barber" ? (
                <div className="field-row">
                  <label htmlFor="f-angle">Angle</label>
                  <input id="f-angle" type="range" min={-180} max={180} step={5}
                         value={f.angle} onChange={(e) => set({ angle: Number(e.target.value) })} />
                </div>
              ) : null}

              {twoD && (
                <div className="field-row">
                  <label>Origin</label>
                  <div className="swatch-row">
                    <input type="range" min={0} max={1} step={0.05} value={f.origin[0]}
                           onChange={(e) => set({ origin: [Number(e.target.value), f.origin[1]] })} />
                    <input type="range" min={0} max={1} step={0.05} value={f.origin[1]}
                           onChange={(e) => set({ origin: [f.origin[0], Number(e.target.value)] })} />
                  </div>
                </div>
              )}

              <div className="field-row">
                <label htmlFor="f-scale">Repeat</label>
                <input id="f-scale" type="range" min={0.2} max={6} step={0.1}
                       value={f.scale} onChange={(e) => set({ scale: Number(e.target.value) })} />
              </div>
            </>
          )}

          <div className="field-row">
            <label htmlFor="f-anim">Flowing</label>
            <input id="f-anim" type="checkbox" checked={f.animated}
                   onChange={(e) => set({ animated: e.target.checked })} />
          </div>
          {f.animated && (
            <div className="field-row">
              <label htmlFor="f-speed">Speed</label>
              <input id="f-speed" type="range" min={0.05} max={2} step={0.05}
                     value={f.speed} onChange={(e) => set({ speed: Number(e.target.value) })} />
            </div>
          )}

          <div className="section-rule">From an image</div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                 style={{ display: "none" }}
                 onChange={(e) => { const file = e.target.files?.[0];
                   onFile(file, (e.target.dataset.style as "ramp" | "image") ?? "ramp");
                   e.target.value = ""; }} />
          <div className="field-row">
            <div className="swatch-row" style={{ gridColumn: "1 / -1" }}>
              <button className="btn" disabled={busy}
                      onClick={() => { if (fileRef.current) { fileRef.current.dataset.style = "ramp"; fileRef.current.click(); } }}>
                {busy ? "reading…" : "Extract ramp"}
              </button>
              <button className="btn" disabled={busy}
                      onClick={() => { if (fileRef.current) { fileRef.current.dataset.style = "image"; fileRef.current.click(); } }}>
                Bake image
              </button>
            </div>
          </div>
          {note && <div className="field-row"><div className="cap-note"><span>{note}</span></div></div>}
          <div className="field-row">
            <div className="cap-note">
              <IconLocked size={13} />
              <span>
                A terminal row is two pixels tall with half-blocks, so a baked
                image lands near 96&times;8 — a colour field, not a photograph,
                and a busy one will fight the text. A GIF becomes a rotating
                palette rather than playing back: the redraw floor is one second.
              </span>
            </div>
          </div>

          {f.rotate && (
            <div className="field-row">
              <label htmlFor="f-rot">Rotate</label>
              <select id="f-rot" value={f.rotate.every}
                      onChange={(e) => set({ rotate: { ...f.rotate!, every: e.target.value as "session" | "hourly" | "daily" } })}>
                <option value="session">per session</option>
                <option value="hourly">hourly</option>
                <option value="daily">daily</option>
              </select>
            </div>
          )}
          {f.rotate && (
            <div className="field-row">
              <div className="cap-note">
                <span>{f.rotate.palettes.length} palettes baked in. Rotation is a clock lookup, so no network on the render path.</span>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
