import type { Config } from "@statusline/core";
import { IconLocked } from "./Icons";
import { FillEditor } from "./FillEditor";

/**
 * Background inspector: opens when you click the drawing field itself rather
 * than a tile. Everything here paints behind the whole bar.
 */
export function SheetInspector({
  cfg, phase, onChange,
}: { cfg: Config; phase: number; onChange: (next: Config) => void }) {
  const th = cfg.theme;
  const g = th.terminalGradient;
  const setTheme = (patch: Partial<Config["theme"]>) =>
    onChange({ ...cfg, theme: { ...th, ...patch } });

  return (
    <aside className="callout" data-linked="true" aria-label="Background inspector">
      <h2 className="region-head">Detail — background<span className="n">sheet</span></h2>
      <div className="callout-body">
        <div className="section-rule">Ground</div>
        <div className="field-row">
          <label htmlFor="s-bg">Colour</label>
          <div className="swatch-row">
            <span className="swatch" style={{ background: th.terminalBg }}>
              <input id="s-bg" type="color" value={th.terminalBg}
                     onChange={(e) => setTheme({ terminalBg: e.target.value })} />
            </span>
            <code style={{ fontSize: 11, color: "var(--dim)" }}>{th.terminalBg}</code>
          </div>
        </div>
        <div className="field-row">
          <div className="cap-note">
            <span>Match this to your terminal's own background so the bar sits flush.</span>
          </div>
        </div>

        <FillEditor fill={th.terminalFill} phase={phase} scope="sheet"
                    onChange={(f) => setTheme({ terminalFill: f })} />

        <div className="section-rule">Colour mode</div>
        <div className="field-row">
          <label htmlFor="s-mode">Depth</label>
          <select id="s-mode" value={th.colorMode}
                  onChange={(e) => setTheme({ colorMode: e.target.value as Config["theme"]["colorMode"] })}>
            <option value="truecolor">truecolor — 16.7M</option>
            <option value="ansi256">ansi256 — 256</option>
            <option value="ansi16">ansi16 — 16</option>
          </select>
        </div>
        <div className="field-row">
          <div className="cap-note">
            <span>The preview quantizes to match, so you see the real downgrade.</span>
          </div>
        </div>


      </div>
    </aside>
  );
}
