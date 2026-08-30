# statusline — implementation backlog

Derived from the master spec, Appendix A, Appendix B, and the code audit of
2026-08-28. Every leaf item names the file and the change, so it can be picked
up cold.

Status key: `[ ]` not started · `[~]` partial · `[x]` done
Sizes are rough: **S** < 1h · **M** 1–4h · **L** 4–12h · **XL** multi-day

---

## EPIC 1 — Safety widgets  ·  size L  ·  **do this first**

> Appendix A calls these "highest value per character". They prevent accidents
> rather than inform. Currently zero of them exist.

### 1.1 Danger-style mechanism (blocks 1.2–1.6)

- [x] **1.1.1** Add `dangerPatterns: string[]` to `ThemeSchema` in `core/src/schema.ts`, default `["prod", "production"]`
- [x] **1.1.2** Add `dangerColor: ColorRef` to `ThemeSchema`, default `"#ff5f5f"`
- [x] **1.1.3** Create `core/src/danger.ts` exporting `isDangerous(value: string, patterns: string[]): boolean`
  - [x] **1.1.3.1** Match on whole word or name segment only — `prod` must hit `eks-prod` but not `product`
  - [x] **1.1.3.2** Case-insensitive
  - [x] **1.1.3.3** Unit test with: `prod`, `production`, `eks-prod-1`, `product`, `reproduce`, `staging`
- [x] **1.1.4** Add `danger?: boolean` to `Span` in `core/src/spans.ts`
- [x] **1.1.5** In `adapters/ansi.ts` `spanAnsi()`, a `danger` span forces `theme.dangerColor` and bold, ignoring every other colour
- [x] **1.1.6** Same in `adapters/web.ts` `toWebSpan()` and `adapters/tmux.ts` `spanTmux()`
- [x] **1.1.7** Test: a danger span is red under all three colour modes and in all three adapters

### 1.2 Kubernetes context tile

- [x] **1.2.1** Add `kubeContext?: string` to `SystemInfo` in `core/src/runtime.ts`
- [x] **1.2.2** Create `core/src/tiles/safety.ts`
- [x] **1.2.3** Implement `kubeContextTile` — id `kube-context`, category `environment`, tier 2, caps `[]`
  - [x] **1.2.3.1** Return `[]` when `data.system?.kubeContext` is absent
  - [x] **1.2.3.2** Mark the span `danger: true` when `isDangerous(ctx, theme.dangerPatterns)`
  - [x] **1.2.3.3** Compact mode: last path segment only
- [x] **1.2.4** Register in `core/src/tiles/registry.ts`
- [x] **1.2.5** CLI producer in `cli/src/producers.ts`: `produceKube()` runs `kubectl config current-context`
  - [x] **1.2.5.1** Guard with `has("kubectl")`; return `{}` when absent
  - [x] **1.2.5.2** 3s timeout
  - [x] **1.2.5.3** Register in `PRODUCERS` under key `kube`
- [x] **1.2.6** Gate collection in `cli/src/index.ts` `collect()` on `used.has("kube-context")`, TTL 10s
- [x] **1.2.7** Add to `sampleData.ts` so the tile is visible in the builder

### 1.3 AWS profile tile

- [x] **1.3.1** Add `awsProfile?: string` to `SystemInfo`
- [x] **1.3.2** Implement `awsProfileTile` — id `aws-profile`, tier 1 (env var, no subprocess)
- [x] **1.3.3** CLI: read `$AWS_PROFILE`; fall back to `$AWS_DEFAULT_PROFILE`; else `default`
  - [x] **1.3.3.1** Do **not** parse `~/.aws/config` on the render path
- [x] **1.3.4** Danger-mark on pattern match
- [x] **1.3.5** Register + sample data

### 1.4 GCP project tile

- [x] **1.4.1** Add `gcpProject?: string` to `SystemInfo`
- [x] **1.4.2** `produceGcp()` runs `gcloud config get-value project` — slow, so TTL 300s
- [x] **1.4.3** Prefer `$CLOUDSDK_CORE_PROJECT` when set (free, no subprocess)
- [x] **1.4.4** Register + sample data + danger mark

### 1.5 Protected-branch warning tile

- [x] **1.5.1** Add `protectedBranches: string[]` to `ThemeSchema`, default `["main", "master", "release"]`
- [x] **1.5.2** Implement `protectedBranchTile` — reads `data.git.branch`, tier 1
- [x] **1.5.3** Render only when the branch is in the list; otherwise `[]`
- [x] **1.5.4** Always danger-styled — this tile exists only to shout
- [x] **1.5.5** Register + sample data

### 1.6 Sandbox state tile

- [x] **1.6.1** Confirmed: Claude Code's documented stdin schema has **no sandbox field**
- [x] **1.6.2** Closed: the field does not exist, so the tile cannot be built
- [x] **1.6.3** N/A — did not survive 1.6.1

### 1.7 Safety bundle

- [x] **1.7.1** Update `SAFETY_TILES` in `web/src/lib/bundles.ts` to the real list
- [x] **1.7.2** Verify the "append safety to every bundle" checkbox now does something visible
- [x] **1.7.3** Screenshot test: applying any bundle with safety on includes the safety tiles

---

## EPIC 2 — Tier 3 system metrics  ·  size XL

> Blocks the `ram.above` / `cpu.above` blink triggers. `/proc/stat` and network
> counters are cumulative since boot — one read tells you nothing.

### 2.0 DECISION REQUIRED (blocks everything below)

- [x] **2.0.1** Choose the sampling architecture:
  - **(a) Daemon sampler** — accurate fixed interval, but another process to run and supervise
  - **(b) Renderer-side prev-sample diff** — no daemon, but the interval becomes "however often the bar happened to redraw", which is irregular
  - Spec prefers (a). **Chosen: (a)**, reusing the existing daemon.
- [x] **2.0.2** Record the choice in `DESIGN.md` and in a comment at the top of `cli/src/metrics.ts`

### 2.1 Sampler (assuming 2.0 → daemon)

- [x] **2.1.1** Create `cli/src/metrics.ts`
- [x] **2.1.2** Define `Metrics` type: `{ cpuPct, memUsed, memTotal, swapUsed, diskPct, load1, netRx, netTx, gpuPct, vramUsed, vramTotal, at }`
- [x] **2.1.3** Linux readers — verified in a container against real /proc; gated in CI
  - [x] **2.1.3.1** `/proc/stat` → cpu delta between two samples
  - [x] **2.1.3.2** `/proc/meminfo` → MemTotal, MemAvailable, SwapTotal, SwapFree
  - [x] **2.1.3.3** `/proc/net/dev` → rx/tx byte delta, summed across non-loopback interfaces
  - [x] **2.1.3.4** `os.loadavg()` for load
  - [x] **2.1.3.5** `statvfs` equivalent via `fs.statfsSync` for disk
- [x] **2.1.4** macOS readers
  - [x] **2.1.4.1** `host_statistics` is not reachable from node — use `top -l 1 -n 0` or `vm_stat`, parse defensively
  - [x] **2.1.4.2** `netstat -ib` for network counters
  - [x] **2.1.4.3** Document that macOS CPU sampling is coarser than Linux
- [x] **2.1.5** GPU
  - [x] **2.1.5.1** `nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader`
  - [x] **2.1.5.2** 100–300ms cold — never on the render path, daemon only
  - [x] **2.1.5.3** macOS has no unprivileged GPU API; `powermetrics` needs sudo. **Detect and hide, do not show a broken tile**
- [x] **2.1.6** Sampler loop in `cli/src/daemon.ts`
  - [x] **2.1.6.1** `setInterval` at 2s, configurable via `daemon.sampleIntervalMs`
  - [x] **2.1.6.2** Keep the previous sample in memory for deltas
  - [x] **2.1.6.3** Write to `CACHE_DIR/metrics.json` atomically (tmp + rename)
  - [x] **2.1.6.4** `unref()` the timer so the daemon can still exit
- [x] **2.1.7** Fallback when no daemon is running
  - [x] **2.1.7.1** Renderer reads `metrics.json`; if it is older than 30s, show nothing rather than stale numbers
  - [x] **2.1.7.2** One-line hint in `statusline doctor` (see 10.3) telling the user to start the daemon

### 2.2 Metric tiles

- [x] **2.2.1** Add `metrics?: Metrics` to `RuntimeData`
- [x] **2.2.2** Create `core/src/tiles/system.ts`
- [x] **2.2.3** `cpuTile` — bar + percentage, reuse `renderBar`
- [x] **2.2.4** `memoryTile` — `12/32G`, humanized
- [x] **2.2.5** `swapTile` — hidden at zero
- [x] **2.2.6** `diskTile` — percentage of the repo's mount
- [x] **2.2.7** `loadTile` — 1-minute average
- [x] **2.2.8** `networkTile` — `↓2.1M ↑340k`, rate not total
- [x] **2.2.9** `gpuTile` + `vramTile` — capability `needsGpu`, hidden when absent
- [x] **2.2.10** Every tile returns `[]` when `metrics` is missing or stale
- [x] **2.2.11** Register all; add to `sampleData.ts`

### 2.3 New signals for the rules engine

- [x] **2.3.1** Add to `SignalId` in `core/src/rules.ts`: `cpu.above`, `mem.above`, `swap.above`, `disk.above`, `load.above`, `gpu.above`, `vram.above`
- [x] **2.3.2** Add `SignalDef` entries with thresholds and notes
- [x] **2.3.3** Implement each branch in `signalActive()`
- [x] **2.3.4** Extend `SignalSchema` enum in `schema.ts` to match
- [x] **2.3.5** Test: each fires above its threshold and not below; missing metrics never fire

---

## EPIC 3 — Fix what currently ships broken  ·  size M  ·  **high priority**

> Two features are in the schema and the palette and do nothing. That is worse
> than not having them.

### 3.1 `flex` — stored but never used

- [x] **3.1.1** Decide the semantics: one flex tile per row absorbs slack; tiles after it are right-aligned
- [x] **3.1.2** Implement in `core/src/layout.ts` `fitRow()`
  - [x] **3.1.2.1** Return `slack` (available columns minus measured width) in `FitResult`
  - [x] **3.1.2.2** Reject more than one flex tile per row in the schema with a clear message
- [x] **3.1.3** `adapters/ansi.ts` `renderRowAnsi()` — pad the flex tile with `slack` spaces
- [x] **3.1.4** `adapters/tmux.ts` — same, but note tmux right-aligns natively via `status-right`
- [x] **3.1.5** `adapters/web.ts` — carry `slack` so the preview matches
- [x] **3.1.6** `separatorTile` should set `flex: true` by default — it exists for exactly this
- [x] **3.1.7** Test: a row with a flex separator right-aligns everything after it, at three widths

### 3.2 Custom-command tile is inert

- [x] **3.2.1** Decide: wire it up, or remove it from the registry. **Do not leave it shipping and dead.**
- [x] **3.2.2** If wiring: add `produceCustom(root, commands)` to `cli/src/producers.ts`
  - [x] **3.2.2.1** Collect every `command` tile's `props.command` from the config
  - [x] **3.2.2.2** Run each via `spawnSync` with `shell: false`, argv array only — **never `sh -c`**
  - [x] **3.2.2.3** Pass `terminal_width` on stdin as the spec requires
  - [x] **3.2.2.4** 2s timeout each; cap combined output at 4KB
  - [x] **3.2.2.5** Cache per command string, TTL from `props.ttl`, default 30s
- [x] **3.2.3** Populate `RuntimeData.custom` in `collect()`, keyed by command string
- [x] **3.2.4** Strip ANSI from command output before measuring — a command may emit colour
- [x] **3.2.5** Builder: warn in the inspector that a custom command runs on your machine
- [x] **3.2.6** Test: a command tile renders its output; a failing command renders nothing, not an error

### 3.3 Credentials never loaded

- [x] **3.3.1** `CREDENTIALS_PATH` is defined in `cli/src/paths.ts` and never read
- [x] **3.3.2** Implement `readCredentials(): Record<string, string>` with mode check
  - [x] **3.3.2.1** Refuse to read if the file is not `0600`; warn to stderr once
  - [x] **3.3.2.2** Return `{}` on missing or malformed
- [x] **3.3.3** Expose to producers only, never to `RuntimeData` — a tile must not see a token
- [x] **3.3.4** `statusline creds set <name>` / `list` subcommands (list shows names, never values)
- [x] **3.3.5** Test: values never appear in `statusline export` output

---

## EPIC 4 — Web builder interaction  ·  size L

### 4.1 Drag to reorder inside the canvas

- [x] **4.1.1** Make `.spec-tile` draggable with `draggable` + `onDragStart` carrying `text/tile-id`
- [x] **4.1.2** Reuse the existing `slotAt()` for the drop target
- [x] **4.1.3** `moveTile(id, target)` in `App.tsx` — splice out, splice in, preserving the tile object
  - [x] **4.1.3.1** Handle same-row moves where removal shifts the target index
- [x] **4.1.4** Distinguish a palette drop (`text/tile-type`) from a reorder (`text/tile-id`) in the drop handler
- [x] **4.1.5** Dim the dragged tile at 40% while it is in flight
- [x] **4.1.6** Test with Playwright: drag tile 1 to position 3, assert config order

### 4.2 Drag between rows

- [x] **4.2.1** Already implied by `slotAt()` returning `{row, index}` — verify it works across rows
- [x] **4.2.2** Highlight the target row while hovering it
- [x] **4.2.3** Test: drag from row 1 to row 3

### 4.3 Row management

- [x] **4.3.1** "+ row" button under the drawing
- [x] **4.3.2** Remove-row control on each row, disabled when it is the last one
- [x] **4.3.3** Reorder rows (up/down buttons are enough; do not build row dragging)
- [x] **4.3.4** Respect `targets.claudeCode.maxRows` — warn past it rather than silently truncating

### 4.4 Systematic capability matrix

- [x] **4.4.1** Create `core/src/capabilities.ts`: `canDo(target, feature, cfg) -> {ok, reason}`
- [x] **4.4.2** Enumerate features: `click`, `osc8Link`, `overline`, `underlineColor`, `truecolor`, `nerdFontGlyph`, `imageFill`
- [x] **4.4.3** Add a target switcher to the builder (Claude Code / tmux / web)
- [x] **4.4.4** Grey any control the active target cannot honour, with `reason` as the tooltip
- [x] **4.4.5** Replace the ad-hoc `cap-note` blocks with generated ones where they overlap
- [x] **4.4.6** Test: switching target to Claude Code disables the action-id field with the right reason

---

## EPIC 5 — Network integrations  ·  size XL

> `gh` is currently the only one. Each of these follows the same shape, so do
> one properly first and the rest are copies.

### 5.1 Reference integration: Linear (do this one first)

- [x] **5.1.1** `produceLinear()` — single GraphQL POST, personal API key from credentials
- [x] **5.1.2** Tiles: assigned count, in progress, in review, cycle progress, triage depth
- [x] **5.1.3** Counts only, never issue titles — a variable-length title is uncompressible
- [x] **5.1.4** TTL 120s, background refresh, `capabilities: ["needsNetwork"]`
- [x] **5.1.5** Render nothing when the credential is absent; surface it in `doctor`
- [x] **5.1.6** Document the shape in `CONTRIBUTING.md` as the template for 5.2–5.7

### 5.2–5.7 The rest (each: producer + tiles + TTL + credential + sample data)

- [x] **5.2** Sentry — error rate delta, new issues, p95
- [ ] **5.3** PagerDuty / Opsgenie — not requested
- [x] **5.4** Vercel — deploy status, build duration, preview URL as OSC 8
- [ ] **5.5** Datadog / Grafana — not requested
- [ ] **5.6** Status pages — not requested — aggregate into one `deps ●` that reddens when any dependency degrades
- [ ] **5.7** Calendar — not requested — next event countdown, meeting in progress (`icalBuddy` on macOS)

---

## EPIC 6 — Attention management  ·  size L

> Appendix B calls `hideWhen` "the single highest-value feature in the whole
> project": it lets a user enable 60 widgets and typically see 12.

### 6.1 `hideWhen`

- [x] **6.1.1** Reuse the rules engine — a `hideWhen` is a signal list, not a new expression language
- [x] **6.1.2** Add `hideWhen?: { signal: SignalId; threshold?: number }[]` to `TileSchema`
- [x] **6.1.3** Evaluate in `buildRow()` before rendering; skip the tile when any entry matches
- [x] **6.1.4** Invert form: `showOnlyWhen` — CI visible only when failing is the canonical case
- [x] **6.1.5** Builder UI in the inspector, next to the rules editor
- [x] **6.1.6** `keepEmpty` must still show hidden tiles in the builder, flagged "hidden here"
- [x] **6.1.7** Test: a tile with `showOnlyWhen: ci.failing` is absent on green and present on red

### 6.2 Rotation slots

- [x] **6.2.1** Add `rotation?: { tiles: string[]; every: "message" | "minute" | "hour" }` to `RowSchema`
- [x] **6.2.2** Seed on the time bucket, never randomly — same rule as the verse
- [x] **6.2.3** Render exactly one of the rotating tiles per slot
- [x] **6.2.4** Builder: a slot renders as a stack with a cycle indicator
- [x] **6.2.5** Test: the same bucket always picks the same tile

### 6.3 Alert escalation

- [x] **6.3.1** Partly covered by the rules engine; add `escalate: true` to a rule
- [x] **6.3.2** An escalating rule overrides `hideWhen` — an incident must not wait for a rotation slot
- [x] **6.3.3** Optional terminal bell on first fire, debounced to once per state change
- [x] **6.3.4** Test: an escalating rule surfaces a tile that `hideWhen` would have hidden

---

## EPIC 7 — Drill-down  ·  size M  ·  tmux only

- [x] **7.1** Add `drill?: { command: string[] }` to `TileSchema` — argv array, never a shell string
- [x] **7.2** `statusline view <tileId>` reads the config and runs the drill command
- [x] **7.3** Extend the generated `.tmux.conf`: `MouseDown1Status` distinguishes an action id from a drill id
- [x] **7.4** Emit `tmux display-popup -E -w 80% -h 80% "statusline view <id>"`
- [x] **7.5** Right-click via `display-menu`: copy value, open in browser, refresh now, hide widget
- [x] **7.6** 15-byte cap applies to drill ids too — validate in the schema
- [x] **7.7** Claude Code cannot do this. State it in the capability matrix rather than half-building it.
- [~] **7.8** Manual verification in a real tmux session — the bar renders and the bindings
  are registered in a live client; the physical click itself still needs a human (see 10.2.3)

---

## EPIC 8 — Declarative widget manifests  ·  size XL

> Appendix B's core bet: adding an integration becomes a YAML file, not a code
> change. Only worth building once EPIC 5 has three or four real integrations
> to generalise from. **Do not start this before then.**

- [ ] **8.1** Design the manifest schema (JSON Schema + Zod), modelled on the real producers from EPIC 5
- [ ] **8.2** `fetch.type: http` — url, method, headers, body, credential refs
- [ ] **8.3** `fetch.type: command` — argv array only, no shell interpolation
- [ ] **8.4** `extract` — JSONPath subset; write the evaluator, do not pull a dependency
- [ ] **8.5** `render` — `full` / `compact` templates with `{{var}}` substitution
- [ ] **8.6** `hideWhen` expression, reusing EPIC 6
- [ ] **8.7** Loader: read `~/.config/statusline/widgets/*.yaml`, validate, register as tiles at runtime
- [ ] **8.8** Validation errors must name the file and line, and must not blank the bar
- [ ] **8.9** Builder shows manifest widgets alongside built-ins, visually distinguished

---

## EPIC 9 — Registry  ·  size XL  ·  **defer**

> A registry where a manifest can run a command is a supply-chain surface aimed
> at developer machines. Not worth building until strangers actually want to
> submit widgets.

- [ ] **9.1** Public repo layout, one YAML per widget by category
- [ ] **9.2** `statusline search <term>` / `statusline add <id>`
- [ ] **9.3** `add` prompts for declared credentials instead of failing silently
- [ ] **9.4** **Security gate**: community submissions are `fetch.type: http` only by default
- [ ] **9.5** `type: command` requires explicit confirmation at install, showing the exact argv
- [ ] **9.6** Never allow shell-string interpolation anywhere in a manifest
- [ ] **9.7** Builder reads the registry index and marks community widgets

---

## EPIC 10 — Smaller gaps  ·  size M

### 10.1 Bundles (5 of 10 shipped)

- [x] **10.1.1** Add SRE / on-call, Indie hacker, Data engineer, Mobile dev, Safety
- [x] **10.1.2** Several depend on EPIC 5 tiles — mark them unavailable until then rather than shipping empty

### 10.2 tmux polish

- [x] **10.2.1** `status-left` path verified: the snippet emits `status-left` and `status-left-length`
- [x] **10.2.2** Right-alignment within the render once `flex` lands (3.1)
- [~] **10.2.3** Click round-trip, partially proven. In a real attached tmux 3.7c client the
  bar renders with colours and glyphs, the `range=user|play_pause` markers survive, the
  `MouseDown1Status` binding is registered, `mouse on` is set, and `statusline action
  play_pause` dispatches with exit 0. **The one unproven link is tmux's own mapping from a
  physical click to `#{mouse_status_range}`** — synthetic SGR and X10 mouse sequences
  injected into a pty never reach tmux's input parser. That is tmux internals, not our code.
  Needs one human click to close.

### 10.3 `statusline doctor`

- [x] **10.3.1** Report: config validity, which credentials are missing, whether the daemon is up, cache freshness
- [x] **10.3.2** Report tiles in the config whose data source is unreachable
- [x] **10.3.3** Suggest the fix for each, one line per finding

### 10.4 Documentation

- [x] **10.4.1** `CONTRIBUTING.md` — how to add a tile (one file plus one registry line)
- [x] **10.4.2** Document the fill mode set with a rendered example of each
- [x] **10.4.3** Document the signal set for rules
- [x] **10.4.4** Re-run the documenter after EPIC 1–4 land, since DESIGN.md describes the built world

---

## Suggested order

1. **EPIC 3** — stop shipping dead features (flex, custom command, credentials)
2. **EPIC 1** — safety widgets; best value-to-effort in the whole backlog
3. **EPIC 4.1–4.3** — reorder and row management; the builder is awkward without them
4. **EPIC 2** — metrics, which unblocks the RAM/CPU triggers
5. **EPIC 6.1** — `hideWhen`; the payoff grows with every tile added after it
6. **EPIC 5.1** — one network integration done properly
7. **EPIC 4.4, 7, 10** — capability matrix, drill-down, polish
8. **EPIC 8, 9** — only once there is enough real integration code to generalise
