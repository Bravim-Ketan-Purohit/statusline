import { useCallback, useMemo, useRef, useState } from "react";
import {
  parseConfig, renderWeb, resolveBreakpoint, type Config, type Tile,
} from "@statusline/core";
import { DEFAULT_CONFIG } from "./lib/defaultConfig";
import { useHistory, loadStored } from "./lib/state";
import { applyBundle, makeTile, type Bundle } from "./lib/bundles";
import { PRESETS, applyPreset, type Preset } from "./lib/themes";
import { PartsList } from "./components/PartsList";
import { DetailCallout } from "./components/DetailCallout";
import { Specimen } from "./components/Specimen";
import { Dimension } from "./components/Dimension";
import { Schedule } from "./components/Schedule";
import { IconUndo, IconRedo, IconCopy, IconDownload, IconDimension } from "./components/Icons";

const PEN = ["--pen-xs", "--pen-sm", "--pen-md", "--pen-lg", "--pen-xl", "--pen-2xl"];
const MIN_PX = 220, MAX_PX = 3840;   // 220px ~= 26 col, just under the xs layer

/** Runtime data for the preview. Synthetic, and labelled as such in the title block. */
const SPECIMEN_DATA = {
  cc: {
    session_id: "sheet-preview",
    cwd: "/Users/you/dev/statusline",
    workspace: { current_dir: "/Users/you/dev/statusline" },
    model: { display_name: "Opus 5" },
    effort: { level: "xhigh" },
    context_window: { total_input_tokens: 226_000, context_window_size: 1_000_000, used_percentage: 23 },
    rate_limits: { five_hour: { used_percentage: 39, resets_at: Date.now() / 1000 + 2520 } },
  },
  local: { now: new Date(), home: "/Users/you", gitBranch: "main", gitRoot: "/Users/you/dev/statusline" },
  columns: 0,
};

export default function App() {
  const { config, setConfig, undo, redo, canUndo, canRedo } = useHistory(
    parseConfig(loadStored(DEFAULT_CONFIG))
  );
  const [px, setPx] = useState(1160);
  const [selected, setSelected] = useState<string | null>(null);
  const [safety, setSafety] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const dragging = useRef(false);

  const cell = config.meta.cellWidth;
  const columns = Math.max(1, Math.round(px / cell));
  const bp = resolveBreakpoint(config.breakpoints, columns);
  const penVar = PEN[config.breakpoints.findIndex((b) => b.id === bp.id)] ?? "--pen-md";

  const render = useMemo(
    () => renderWeb(config, { ...SPECIMEN_DATA, columns }),
    [config, columns]
  );

  const flat = useMemo(() => config.rows.flatMap((r) => r.tiles), [config]);
  const selTile = flat.find((t) => t.id === selected) ?? null;
  const measured = useMemo(() => {
    for (const row of render.rows)
      for (const t of row.tiles)
        if (t.tileId === selected) return { width: t.width, ghost: t.ghost };
    return null;
  }, [render, selected]);

  const say = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2200); };

  const addTile = useCallback((type: string, rowIndex = 0) => {
    setConfig((c) => {
      const rows = c.rows.length ? [...c.rows] : [{ id: "row-1", tiles: [] }];
      const i = Math.min(rowIndex, rows.length - 1);
      rows[i] = { ...rows[i]!, tiles: [...rows[i]!.tiles, makeTile(type, rows[i]!.tiles.length + 1)] };
      return { ...c, rows };
    });
  }, [setConfig]);

  const updateTile = useCallback((next: Tile) => {
    setConfig((c) => ({
      ...c,
      rows: c.rows.map((r) => ({ ...r, tiles: r.tiles.map((t) => (t.id === next.id ? next : t)) })),
    }));
  }, [setConfig]);

  const deleteTile = useCallback(() => {
    if (!selected) return;
    setConfig((c) => ({ ...c, rows: c.rows.map((r) => ({ ...r, tiles: r.tiles.filter((t) => t.id !== selected) })) }));
    setSelected(null);
  }, [selected, setConfig]);

  const onBundle = useCallback((b: Bundle) => {
    setConfig((c) => applyBundle(c, b, safety));
    setSelected(null);
    say(`Applied ${b.name}${safety ? " with safety parts" : ""}.`);
  }, [safety, setConfig]);

  const startDrag = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setPx(Math.round(MIN_PX + ratio * (MAX_PX - MIN_PX)));
  };
  const gripPct = ((px - MIN_PX) / (MAX_PX - MIN_PX)) * 100;

  const onPreset = useCallback((p: Preset) => {
    setConfig((c) => applyPreset(c, p));
    say(`Applied the ${p.name} theme.`);
  }, [setConfig]);

  const importB64 = async () => {
    const raw = window.prompt("Paste a statusline config (base64, or raw JSON):");
    if (!raw) return;
    const text = raw.trim().replace(/^statusline import\s+/, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text.startsWith("{") ? text : decodeURIComponent(escape(atob(text))));
    } catch { say("That did not decode as base64 or JSON."); return; }
    try {
      setConfig(parseConfig(parsed));
      setSelected(null);
      say("Config imported.");
    } catch { say("That decoded, but it is not a valid config."); }
  };

  const copyJson = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(config, null, 2)); say("Config copied as JSON."); }
    catch { say("Clipboard unavailable — use Download."); }
  };
  const copyInstall = async () => {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
    try { await navigator.clipboard.writeText(`statusline import ${b64}`); say("Install command copied."); }
    catch { say("Clipboard unavailable — use Download."); }
  };
  const download = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${config.meta.name || "statusline"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="sheet" style={{ ["--pen" as string]: `var(${penVar})` }}>
      <header className="sheet-head">
        <div className="sheet-mark">
          <IconDimension size={18} />
          <div>
            <h1>statusline</h1>
            <div className="sub">SHEET 1 OF 1 · REV A</div>
          </div>
        </div>
        <div className="layers" role="tablist" aria-label="Breakpoint layers">
          {config.breakpoints.map((b, i) => (
            <button
              key={b.id}
              role="tab"
              className="layer-tab"
              aria-selected={b.id === bp.id}
              style={{ ["--tab-pen" as string]: `var(${PEN[i] ?? "--pen-md"})` }}
              /* land on the layer's own column count, so the drawing and the
                 schedule always describe the same width */
              onClick={() => setPx(Math.round(Math.max(b.minCols, 28) * cell))}
            >
              <span className="id">{b.id}</span>
              <span className="cols">≥{b.minCols}</span>
              <span className="pen" />
            </button>
          ))}
        </div>
      </header>

      <div className="sheet-body">
        <PartsList cfg={config} onAdd={addTile} onBundle={onBundle} safety={safety} onSafety={setSafety} />

        <main
          className="field"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const type = e.dataTransfer.getData("text/tile-type");
            if (type) { addTile(type); say("Part added to the drawing."); }
          }}
        >
          <div className="field-scroll">
            <div className="drawing" style={{ width: px }}>
              <Dimension columns={columns} px={px} />
              <Specimen render={render} cfg={config} selected={selected} onSelect={setSelected} columns={columns} />
            </div>
          </div>
          <Schedule cfg={config} data={SPECIMEN_DATA} activeId={bp.id}
                    onPick={(c) => setPx(Math.max(MIN_PX, Math.round(c * cell)))} />
          <div className="handle">
            <span className="handle-figure">{columns} col · {px} px · layer {bp.id}</span>
            <div className="handle-track" onPointerDown={(e) => { startDrag(e); onDrag(e); }}
                 onPointerMove={onDrag} onPointerUp={() => (dragging.current = false)}
                 role="slider" aria-label="Terminal width in columns"
                 aria-valuemin={Math.round(MIN_PX / cell)} aria-valuemax={Math.round(MAX_PX / cell)}
                 aria-valuenow={columns} tabIndex={0}
                 onKeyDown={(e) => {
                   const step = e.shiftKey ? 100 : 10;
                   if (e.key === "ArrowLeft") setPx((p) => Math.max(MIN_PX, p - step));
                   if (e.key === "ArrowRight") setPx((p) => Math.min(MAX_PX, p + step));
                 }}>
              <span className="handle-grip" style={{ left: `${gripPct}%` }} />
            </div>
          </div>
        </main>

        <DetailCallout cfg={config} tile={selTile} bpId={bp.id} measured={measured}
                       onChange={updateTile} onDelete={deleteTile} />
      </div>

      <footer className="title-block">
        <div className="tb-cell"><span className="k">Drawing</span><span className="v">{config.meta.name}</span></div>
        <div className="tb-cell"><span className="k">Scale</span><span className="v">{cell} px / col</span></div>
        <div className="tb-cell"><span className="k">Colour</span>
          <select className="v" style={{ background: "none", border: 0, padding: 0 }}
                  value={config.theme.colorMode}
                  onChange={(e) => setConfig((c) => ({ ...c, theme: { ...c.theme, colorMode: e.target.value as Config["theme"]["colorMode"] } }))}>
            <option value="truecolor">truecolor</option>
            <option value="ansi256">ansi256</option>
            <option value="ansi16">ansi16</option>
          </select>
        </div>
        <div className="tb-cell"><span className="k">Ground</span>
          <span className="v swatch-row">
            <span className="swatch" style={{ background: config.theme.terminalBg, width: 18, height: 14 }}>
              <input type="color" value={config.theme.terminalBg}
                     onChange={(e) => setConfig((c) => ({ ...c, theme: { ...c.theme, terminalBg: e.target.value } }))} />
            </span>
            {config.theme.terminalBg}
          </span>
        </div>
        <div className="tb-cell"><span className="k">Parts</span><span className="v">{flat.length} drawn</span></div>
        <div className="tb-cell"><span className="k">Data</span><span className="v">synthetic</span></div>
        <div className="tb-cell tb-themes">
          <span className="k">Theme</span>
          <span className="v theme-row">
            {PRESETS.map((p) => (
              <button key={p.id} className="theme-chip" onClick={() => onPreset(p)} title={p.note}>
                <span className="chip-swatch" style={{ background: p.terminalBg }} />
                {p.name}
              </button>
            ))}
          </span>
        </div>
        <div className="tb-spacer" aria-hidden="true" />
        <div className="tb-cell tb-actions">
          <button className="btn" onClick={undo} disabled={!canUndo} aria-label="Undo"><IconUndo size={13} /></button>
          <button className="btn" onClick={redo} disabled={!canRedo} aria-label="Redo"><IconRedo size={13} /></button>
          <button className="btn" onClick={importB64}><IconCopy size={13} /> Import</button>
          <button className="btn" onClick={download}><IconDownload size={13} /> JSON</button>
          <button className="btn" onClick={copyJson}><IconCopy size={13} /> Raw</button>
          <button className="btn btn-pen" onClick={copyInstall}>Copy install</button>
        </div>
      </footer>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
