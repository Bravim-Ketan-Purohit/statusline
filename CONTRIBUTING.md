# Contributing

## Adding a tile

One file plus one registry line. Nothing else in the codebase switches on a
tile type.

**1. Write the module** in `packages/core/src/tiles/`:

```ts
import { span } from "../spans.js";
import type { TileModule } from "./types.js";

export const myTile: TileModule<{ label: string }> = {
  id: "my-tile",
  displayName: "My tile",
  category: "session",      // session · git · environment · personal · media · layout
  tier: 0,                  // see the tier table below
  capabilities: [],         // needsGit · needsNetwork · needsDaemon · webOnly
  defaultProps: { label: "" },
  render(props, data, mode) {
    const v = data.cc.some_field;
    if (v === undefined) return [];   // absent means the tile does not exist
    return [span(String(v))];
  },
};
```

**2. Register it** in `packages/core/src/tiles/registry.ts` — import it and add
it to the `MODULES` array.

**3. If it needs data the host must fetch**, add a producer in
`packages/cli/src/producers.ts`, register it in `PRODUCERS`, and gate its
collection in `collect()` so a config without your tile never pays for it.

**4. Add it to `packages/web/src/lib/sampleData.ts`**, or it renders nothing in
the builder and cannot be styled.

### Rules a tile must follow

- **Return `[]` when the data is absent.** Never an empty box, never a dash.
  A test enforces this for every tile in the registry.
- **Provide a compact form.** The solver uses it before it resorts to dropping
  the tile entirely.
- **Never touch the network or a large repo inside `render`.** That belongs in
  a producer, which runs in a detached refresh.
- **Keep figures column-stable.** Pad percentages so they do not shift as they
  change; use tabular figures.

### Tiers

| Tier | Cost | Where the work happens |
|---|---|---|
| 0 | free | already in Claude Code's stdin JSON |
| 1 | <1ms | a local file or an env var |
| 2 | 5-50ms | a local subprocess, cached 2-5s |
| 3 | sampled | the daemon writes a metrics file |
| 4 | 200ms-3s | network, cached 60-300s, background only |

## Adding a fill mode

Add the id to `FillMode` and `FILL_MODES` in `packages/core/src/fill.ts`, then
one `case` in `fieldAt()` returning a scalar in 0..1. Every adapter picks it up
for free, because all three call `fillColorAt`.

## Adding a signal

Add the id to `SignalId` and `SIGNALS` in `packages/core/src/rules.ts`, one
`case` in `signalActive()`, and the same id to `SignalSchema` in `schema.ts`.
A signal reading absent data must return `false` — a silent alarm beats a
false one.

## Testing

```
pnpm build && pnpm test
pnpm bench
docker run --rm -v "$PWD":/repo:ro -w /repo node:22-alpine \
  node scripts/verify-linux-metrics.mjs
node scripts/gen-reference.mjs
```

Every change should keep these green:

- empty `{}`, malformed input and null-heavy input all exit 0 with no stderr
- 40 columns and 240 columns both render without wrapping
- the warm render stays under 100ms
