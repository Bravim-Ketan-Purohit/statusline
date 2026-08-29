import type { Config } from "@statusline/core";
import { IconLocked } from "./Icons";

/**
 * Background inspector: opens when you click the drawing field itself rather
 * than a tile. Everything here paints behind the whole bar.
 */
export function SheetInspector({
  cfg, onChange,
}: { cfg: Config; onChange: (next: Config) => void }) {
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

        <div className="section-rule">Gradient</div>
        <div className="field-row">
          <label htmlFor="s-grad">Enable</label>
          <input id="s-grad" type="checkbox" checked={!!g}
                 onChange={(e) => setTheme({ terminalGradient: e.target.checked
                   ? { from: th.terminalBg, to: "#5f00af", animated: false, speed: 0.25 } : null })} />
        </div>
        {g && (
          <>
            <div className="field-row">
              <label>Stops</label>
              <div className="swatch-row">
                <span className="swatch" style={{ background: g.from }}>
                  <input type="color" value={g.from}
                         onChange={(e) => setTheme({ terminalGradient: { ...g, from: e.target.value } })} />
                </span>
                <span className="swatch" style={{ background: g.to }}>
                  <input type="color" value={g.to}
                         onChange={(e) => setTheme({ terminalGradient: { ...g, to: e.target.value } })} />
                </span>
              </div>
            </div>
            <div className="field-row">
              <label htmlFor="s-anim">Flowing</label>
              <input id="s-anim" type="checkbox" checked={g.animated}
                     onChange={(e) => setTheme({ terminalGradient: { ...g, animated: e.target.checked } })} />
            </div>
            {g.animated && (
              <div className="field-row">
                <label htmlFor="s-speed">Speed</label>
                <input id="s-speed" type="range" min={0.05} max={2} step={0.05} value={g.speed}
                       onChange={(e) => setTheme({ terminalGradient: { ...g, speed: Number(e.target.value) } })} />
              </div>
            )}
            <div className="field-row">
              <div className="cap-note">
                <IconLocked size={13} />
                <span>
                  A flowing gradient animates smoothly here, but a terminal only
                  redraws when Claude Code re-runs the script. With
                  <code> refreshInterval: 1</code> that is one step per second —
                  a slow pulse, not a flow. tmux behaves the same via
                  <code> status-interval</code>.
                </span>
              </div>
            </div>
          </>
        )}

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

        <div className="section-rule">Not available</div>
        <div className="field-row">
          <div className="cap-note">
            <IconLocked size={13} />
            <span>
              Images and GIFs cannot be a fill. Claude Code captures the script's
              stdout as text, so there is no surface to draw a raster onto. Flowing
              gradients and block-character fills are the closest a terminal gets.
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
