import { SIGNALS, EDGE_LIST, type Rule, type SignalId, type Border } from "@statusline/core";
type Visibility = { signal: SignalId; threshold?: number };
import { IconTrash, IconLocked } from "./Icons";

/**
 * Border and conditional styling.
 *
 * Rules are evaluated top to bottom and later ones win, so the list reads as
 * an override chain: a steady border first, then the states that replace it.
 */

const DEFAULT_RULE: Rule = {
  signal: "ci.failing",
  border: { edge: "block", line: "both", color: "#ff5f5f" },
  blink: { target: "border", color: "#ff0000", hz: 0.5 },
};

function BorderControls({
  border, nerdFont, onChange,
}: { border: Border | undefined; nerdFont: boolean; onChange: (b: Border) => void }) {
  const b = border ?? { edge: "none" as const, line: "none" as const };
  return (
    <>
      <div className="field-row">
        <label>Edge</label>
        <select value={b.edge} onChange={(e) => onChange({ ...b, edge: e.target.value as Border["edge"] })}>
          {EDGE_LIST.map((x) => (
            <option key={x.id} value={x.id} disabled={x.needsNerdFont && !nerdFont}>
              {x.name}{x.cols ? ` (${x.cols} col)` : ""}{x.needsNerdFont && !nerdFont ? " — needs a Nerd Font" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row">
        <label>Line</label>
        <select value={b.line} onChange={(e) => onChange({ ...b, line: e.target.value as Border["line"] })}>
          <option value="none">none</option>
          <option value="under">underline</option>
          <option value="over">overline</option>
          <option value="both">both</option>
        </select>
      </div>
      <div className="field-row">
        <label>Colour</label>
        <div className="swatch-row">
          <span className="swatch" style={{ background: b.color ?? "transparent" }}>
            <input type="color" value={b.color ?? "#ffffff"}
                   onChange={(e) => onChange({ ...b, color: e.target.value })} />
          </span>
          <code style={{ fontSize: 11, color: "var(--dim)" }}>{b.color ?? "inherits"}</code>
        </div>
      </div>
    </>
  );
}

export function RulesEditor({
  border, rules, nerdFont, hideWhen, showOnlyWhen, suppressed,
  onBorder, onRules, onVisibility,
}: {
  border: Border | undefined;
  rules: Rule[] | undefined;
  nerdFont: boolean;
  hideWhen: Visibility[] | undefined;
  showOnlyWhen: Visibility[] | undefined;
  suppressed?: boolean;
  onBorder: (b: Border | undefined) => void;
  onRules: (r: Rule[] | undefined) => void;
  onVisibility: (v: { hideWhen?: Visibility[]; showOnlyWhen?: Visibility[] }) => void;
}) {
  const list = rules ?? [];
  const set = (i: number, patch: Partial<Rule>) =>
    onRules(list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <>
      <div className="section-rule">Border</div>
      <BorderControls border={border} nerdFont={nerdFont} onChange={onBorder} />
      <div className="field-row">
        <div className="cap-note">
          <IconLocked size={13} />
          <span>
            An edge costs two columns and the solver counts them. Lines are SGR
            and cost none: underline works anywhere, while overline and coloured
            underlines want a modern terminal (Kitty, WezTerm, iTerm2, Ghostty).
            Elsewhere they are ignored rather than garbled.
          </span>
        </div>
      </div>

      <div className="section-rule">Visibility</div>
      <div className="field-row">
        <label htmlFor="v-mode">Show</label>
        <select id="v-mode"
                value={showOnlyWhen?.length ? "only" : hideWhen?.length ? "hide" : "always"}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "always") return onVisibility({ hideWhen: undefined, showOnlyWhen: undefined });
                  const first: Visibility = { signal: "ci.failing" };
                  if (v === "only") return onVisibility({ showOnlyWhen: [first], hideWhen: undefined });
                  return onVisibility({ hideWhen: [first], showOnlyWhen: undefined });
                }}>
          <option value="always">always</option>
          <option value="only">only when…</option>
          <option value="hide">except when…</option>
        </select>
      </div>
      {(showOnlyWhen?.length || hideWhen?.length) ? (
        <>
          <div className="field-row">
            <label>Signal</label>
            <select
              value={(showOnlyWhen ?? hideWhen)![0]!.signal}
              onChange={(e) => {
                const sig = e.target.value as SignalId;
                const def = SIGNALS.find((s) => s.id === sig);
                const next: Visibility[] = [{ signal: sig, threshold: def?.threshold?.def }];
                onVisibility(showOnlyWhen?.length ? { showOnlyWhen: next } : { hideWhen: next });
              }}>
              {SIGNALS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {(() => {
            const cur = (showOnlyWhen ?? hideWhen)![0]!;
            const def = SIGNALS.find((s) => s.id === cur.signal);
            if (!def?.threshold) return null;
            return (
              <div className="field-row">
                <label>{def.threshold.label}</label>
                <input type="number" min={def.threshold.min} max={def.threshold.max}
                       step={def.threshold.step} value={cur.threshold ?? def.threshold.def}
                       onChange={(e) => {
                         const next: Visibility[] = [{ ...cur, threshold: Number(e.target.value) }];
                         onVisibility(showOnlyWhen?.length ? { showOnlyWhen: next } : { hideWhen: next });
                       }} />
              </div>
            );
          })()}
          <div className="field-row">
            <div className="cap-note">
              <IconLocked size={13} />
              <span>
                {suppressed
                  ? "Hidden in a terminal right now. The canvas keeps it hatched so you can still edit it."
                  : "Visible in a terminal right now."}
                {" "}An escalating rule below overrides this, so an alarm is never filtered away.
              </span>
            </div>
          </div>
        </>
      ) : null}

      <div className="section-rule">When… then</div>
      {!list.length && (
        <div className="field-row">
          <div className="cap-note">
            <span>No rules. Add one to make this tile react — a red blink when CI
                  fails, a green edge when the PR is approved.</span>
          </div>
        </div>
      )}

      {list.map((r, i) => {
        const def = SIGNALS.find((s) => s.id === r.signal);
        return (
          <div className="rule" key={i}>
            <div className="rule-head">
              <span className="rule-n">{String(i + 1).padStart(2, "0")}</span>
              <select value={r.signal}
                      onChange={(e) => {
                        const sig = e.target.value as SignalId;
                        const d = SIGNALS.find((s) => s.id === sig);
                        set(i, { signal: sig, threshold: d?.threshold?.def });
                      }}>
                {SIGNALS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button className="stop-x" aria-label="Remove rule"
                      onClick={() => onRules(list.filter((_, j) => j !== i).length
                        ? list.filter((_, j) => j !== i) : undefined)}>
                <IconTrash size={12} />
              </button>
            </div>
            <div className="field-row">
              <div className="cap-note"><span>{def?.note}</span></div>
            </div>
            {def?.threshold && (
              <div className="field-row">
                <label>{def.threshold.label}</label>
                <input type="number" min={def.threshold.min} max={def.threshold.max}
                       step={def.threshold.step} value={r.threshold ?? def.threshold.def}
                       onChange={(e) => set(i, { threshold: Number(e.target.value) })} />
              </div>
            )}

            <BorderControls border={r.border} nerdFont={nerdFont}
                            onChange={(b) => set(i, { border: b })} />

            <div className="field-row">
              <label>Escalate</label>
              <input type="checkbox" checked={!!r.escalate}
                     onChange={(e) => set(i, { escalate: e.target.checked || undefined })} />
            </div>
            <div className="field-row">
              <label>Blink</label>
              <input type="checkbox" checked={!!r.blink}
                     onChange={(e) => set(i, { blink: e.target.checked
                       ? { target: "border", color: r.border?.color ?? "#ff0000", hz: 0.5 }
                       : undefined })} />
            </div>
            {r.blink && (
              <>
                <div className="field-row">
                  <label>Blink what</label>
                  <select value={r.blink.target}
                          onChange={(e) => set(i, { blink: { ...r.blink!, target: e.target.value as "border" | "bg" | "fg" } })}>
                    <option value="border">the border</option>
                    <option value="bg">the background</option>
                    <option value="fg">the text</option>
                  </select>
                </div>
                <div className="field-row">
                  <label>Blink colour</label>
                  <div className="swatch-row">
                    <span className="swatch" style={{ background: r.blink.color }}>
                      <input type="color" value={r.blink.color}
                             onChange={(e) => set(i, { blink: { ...r.blink!, color: e.target.value } })} />
                    </span>
                  </div>
                </div>
                <div className="field-row">
                  <label>Rate</label>
                  <input type="range" min={0.1} max={2} step={0.1} value={r.blink.hz}
                         onChange={(e) => set(i, { blink: { ...r.blink!, hz: Number(e.target.value) } })} />
                </div>
                <div className="field-row">
                  <div className="cap-note">
                    <IconLocked size={13} />
                    <span>
                      {r.blink.hz.toFixed(1)} Hz. The blink is computed from the
                      clock, not SGR 5, so it works in every terminal — but it can
                      only change when the bar redraws. With
                      <code> refreshInterval: 1</code> anything above 0.5&nbsp;Hz
                      lands on the same phase twice and looks irregular.
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      <div className="field-row">
        <button className="btn" style={{ gridColumn: "1 / -1" }}
                disabled={list.length >= 12}
                onClick={() => onRules([...list, { ...DEFAULT_RULE }])}>
          + rule
        </button>
      </div>
    </>
  );
}
