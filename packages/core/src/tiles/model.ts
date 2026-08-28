import { span } from "../spans.js";
import type { TileModule } from "./types.js";

export const modelTile: TileModule<{ showEffort: boolean; showContextSize: boolean }> = {
  id: "model",
  displayName: "Model",
  category: "session",
  tier: 0,
  capabilities: [],
  defaultProps: { showEffort: true, showContextSize: true },
  render(props, { cc }, mode) {
    const name = cc.model?.display_name;
    if (!name) return [];
    const out = [span(name, { bold: true })];
    if (mode === "full") {
      const size = cc.context_window?.context_window_size;
      if (props.showContextSize && size) {
        out.push(span(" · ", { dim: true }));
        out.push(span(size >= 1_000_000 ? "1M" : `${Math.round(size / 1000)}k`));
      }
      const lvl = cc.effort?.level;
      if (props.showEffort && lvl) {
        out.push(span(" · ", { dim: true }));
        out.push(span(lvl));
      }
    }
    return out;
  },
};
