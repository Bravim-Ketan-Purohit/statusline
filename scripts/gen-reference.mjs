/**
 * Regenerates docs/REFERENCE.md from the registries themselves, so the docs
 * cannot drift from the code. Run after adding a tile, fill mode or signal.
 */
import { FILL_MODES, SIGNALS, EDGE_LIST, allTiles, TARGETS } from "../packages/core/dist/index.js";
import { writeFileSync } from "node:fs";

const L = [];
L.push("# Reference");
L.push("");
L.push("Generated from `packages/core`. Re-run `node scripts/gen-reference.mjs` after");
L.push("adding a tile, a fill mode, a signal or an edge style.");
L.push("");

const tiles = allTiles().sort((a, b) =>
  a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
L.push(`## Tiles (${tiles.length})`);
L.push("");
L.push("| id | tier | category | name |");
L.push("|---|---|---|---|");
for (const t of tiles) L.push(`| \`${t.id}\` | ${t.tier} | ${t.category} | ${t.displayName} |`);
L.push("");

L.push(`## Fill modes (${FILL_MODES.length})`);
L.push("");
L.push("| mode | what it does |");
L.push("|---|---|");
for (const m of FILL_MODES) L.push(`| \`${m.id}\` | ${m.note} |`);
L.push("");

L.push(`## Signals (${SIGNALS.length})`);
L.push("");
L.push("Used by rules, `hideWhen` and `showOnlyWhen`. A signal whose data is absent");
L.push("always returns false, so a missing sampler never fires a threshold.");
L.push("");
L.push("| signal | threshold | fires when |");
L.push("|---|---|---|");
for (const s of SIGNALS) {
  const th = s.threshold ? `${s.threshold.label} (default ${s.threshold.def})` : "—";
  L.push(`| \`${s.id}\` | ${th} | ${s.note} |`);
}
L.push("");

L.push(`## Border edges (${EDGE_LIST.length})`);
L.push("");
L.push("An edge is characters and costs columns, which the solver measures. A line");
L.push("(underline / overline) is SGR and costs none.");
L.push("");
L.push("| edge | columns | note |");
L.push("|---|---|---|");
for (const e of EDGE_LIST) L.push(`| \`${e.id}\` | ${e.cols} | ${e.needsNerdFont ? "needs a Nerd Font" : ""} |`);
L.push("");

L.push("## Targets");
L.push("");
L.push("| target | note |");
L.push("|---|---|");
for (const t of TARGETS) L.push(`| ${t.name} | ${t.note} |`);
L.push("");

writeFileSync(new URL("../docs/REFERENCE.md", import.meta.url), L.join("\n"));
console.log("docs/REFERENCE.md regenerated:", L.length, "lines");
