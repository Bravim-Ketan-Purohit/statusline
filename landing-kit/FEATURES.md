# Statusline — Feature & Modification Reference

Everything a person can do with the product, and every knob they can turn.
Written for whoever is building the landing page: each section says what the
thing *is*, what it *does for the user*, and which asset shows it.

Counts in this document were read out of the shipping build, not from memory.
Verify any of them with `statusline tiles`, `statusline --help`, or
`packages/core/src/schema.ts`.

---

## 1. What it is, in one paragraph

Statusline is a visual builder for the one row of text that sits at the bottom
of your terminal. You drag tiles onto a drawing sheet, style them, tell them how
to behave when the terminal gets narrow, and export a single config file. A CLI
then renders that config into **Claude Code**, into **tmux**, and into the
browser preview — from one layout engine, so the preview cannot drift from what
you actually see at 2am.

**The headline promise:** design it once, and it looks the same in all three places.

---

## 2. The three render targets

| | Claude Code | tmux | Web preview |
|---|---|---|---|
| How it runs | captured stdout, JSON on stdin | `#()` in the status format | live in the browser |
| Rows | up to 5 | 1 (left or right side) | unlimited |
| Refresh floor | 1 second | tmux's `status-interval` | 60fps |
| Smooth animation | no — one step per refresh | no | yes |
| Click a tile | opens an OSC 8 hyperlink | runs a real command | DOM events |
| Colour | truecolor / 256 / 16 | truecolor / 256 / 16 | truecolor |

**The asymmetry is the interesting part, and worth saying out loud on the page:**
tmux can dispatch a real command on click, Claude Code can only open a link, and
the web preview has full DOM events. The builder shows a per-target capability
readout so you find out *while designing* rather than after installing —
see `05-background-inspector.png`, the "ON THIS TARGET" panel.

Style presets for Claude Code: `pills`, `powerline`, `plain`.

---

## 3. What a person can DO — features

### 3.1 Build the layout
- Drag any of **68 tiles** from the parts list onto the sheet → `drag-and-drop.mp4` / `hero-build.mp4`
- Reorder tiles within a row by dragging
- Add and remove rows (up to 5 for Claude Code)
- Move rows up/down, delete rows
- Start from **10 pre-made bundles** instead of an empty sheet
- Undo / redo on every change
- Live specimen bar at the top showing the real rendered result

### 3.2 See it at every terminal width
- **Six breakpoints** — xs ≥0, sm ≥40, md ≥80, lg ≥120, xl ≥160, 2xl ≥220 columns
- Drag the dimension handle to scrub width continuously → `responsive-overflow.mp4`
- Keyboard-accessible too: arrow keys step 10 columns, shift-arrow steps 100
- **Layer schedule** table: for each breakpoint, how many tiles are drawn,
  how many get dropped, and how many columns are used → `04-layer-schedule.png`
- Click any row of the schedule to jump the preview to that width

### 3.3 Make it react to what's happening
- **26 signals** covering CI, PRs, git state, context budget, spend, and machine load
- Bind a signal to a colour change, a border, or a blink → `blink-rule.mp4`
- Hide a tile until it has something to say (`showOnlyWhen`)
- Ring the terminal bell once when an incident starts — never on every render
- `escalate` lets a firing rule override the hide rules

### 3.4 Make it yours visually
- Per-tile foreground and background colours
- **15 animated fill modes** → `background-fills.mp4`
- Import an image or GIF and bake it into the bar → `image-crop.mp4`
- **7 border edges** and **4 underline/overline styles**
- **5 built-in themes** → `themes.mp4`

### 3.5 Make it interactive
- Give a tile a click **action** (media controls ship built in)
- Give a tile a **drill-down**: clicking opens a tmux popup running a command
- OSC 8 hyperlinks in Claude Code

### 3.6 Ship it
- Copy a one-line install command
- Export the config as JSON or as a base64 blob
- `statusline import` merges into `~/.claude/settings.json` — shows a diff, never overwrites blindly
- `statusline tmux-conf` prints the `.tmux.conf` snippet, mouse binding included

### 3.7 Operate it
- `statusline doctor` reports what's misconfigured and how to fix it
- `statusline daemon` samples machine metrics off the render path
- `statusline approve` gates any custom command before it can run
- `statusline creds` stores API tokens in a `0600` file, never in the config

---

## 4. Every modification — the "mods"

This is the complete list of what can be changed on a tile or on the sheet.
Ranges are the actual schema limits.

### 4.1 Annotation *(per tile)*
| Mod | Values | Notes |
|---|---|---|
| Glyph | any string | the leading symbol, e.g. `◷` `⎇` `▮` |
| Label | any string | the dim word before the value, e.g. `time` |
| Label dim | on / off | dims the label so the value reads first |

### 4.2 Pens — colour *(per tile)*
| Mod | Values |
|---|---|
| Ground | `#rrggbb` or `palette:<name>` |
| Ink | `#rrggbb` or `palette:<name>` |

Named palette entries are defined once on the sheet and referenced everywhere,
so re-theming is one edit.

### 4.3 Fill *(per tile, or the whole bar)*

**Kind:** `none` · `gradient` · `image (baked cells)`

**15 modes:**

| | | | |
|---|---|---|---|
| `linear` | `radial` | `conic` | `diamond` |
| `wave` | `ripple` | `spiral` | `barber` |
| `comet` | `scan` | `plasma` | `pulse` |
| `breathe` | `rainbow` | `strobe` | |

**Parameters:**

| Mod | Range | What it does |
|---|---|---|
| Stops | 1–16 colour stops | the ramp the mode samples |
| Angle | −360° to 360° | direction of travel |
| Origin | x, y each 0–1 | where radial/conic/spiral emanate from |
| Flowing | on / off | animate the phase with wall-clock time |
| Speed | 0.01–4 cycles/sec | 0.2 = one traverse every five seconds |
| Scale | 0.05–12 | zoom of the pattern |
| Rotate palettes | up to 24 palettes | cycle `per session` / `hourly` / `daily` |

> **Honest caveat for the page:** a terminal has no gradients. Every fill is
> quantised and emitted one SGR escape per cell. In Claude Code the phase
> advances once per refresh, and the refresh floor is one second — so a flowing
> fill is a slow pulse there, not a smooth flow. The web preview animates
> properly. The builder tells you this on the tile itself.

### 4.4 Images and GIFs
| Mod | Detail |
|---|---|
| Accepted | PNG, JPEG, WebP, GIF |
| Crop UI | profile-photo style: drag to position, slider to zoom → `image-crop.mp4` |
| Extract ramp | pulls an **8-stop gradient** out of your crop |
| Bake image | renders the crop to a **96 × 8 cell matrix** using half-blocks |
| GIF | becomes a **rotating palette**, not playback — the redraw floor is one second |

> A terminal row is two pixels tall with half-blocks. A baked image is a colour
> field, not a photograph, and a busy one will fight the text. Worth saying
> plainly rather than overselling.

### 4.5 Borders *(per tile)*
| Edge | Cost | Note |
|---|---|---|
| `none` | 0 col | |
| `thin` | 2 col | |
| `block` | 2 col | half block |
| `bracket` | 2 col | `[ … ]` |
| `round` | 2 col | `( … )` |
| `angle` | 2 col | |
| `powerline` | 2 col | needs a Nerd Font |

| Line | Cost | Portability |
|---|---|---|
| `none` / `underline` / `overline` / `both` | 0 col — SGR only | underline works anywhere; overline and coloured underlines want Kitty, WezTerm, iTerm2 or Ghostty, and are ignored elsewhere rather than garbled |

Border colour is separate and optional; it inherits the tile's ink if unset.

**Edges cost real columns and the layout solver counts them.** That was a bug
once; now it's a tested guarantee.

### 4.6 Rules — make it react *(up to 12 per tile)*

**All 26 signals:**

| Group | Signals |
|---|---|
| CI | `ci.failing` `ci.passing` `ci.running` |
| Pull requests | `pr.approved` `pr.changes` `pr.pending` `pr.open` `review.waiting` |
| Git | `git.conflict` `git.dirty` `git.clean` `git.ahead` `git.behind` |
| Budget | `context.above` `fivehour.above` `sevenday.above` `cost.above` |
| Machine | `cpu.above` `mem.above` `swap.above` `disk.above` `load.above` `gpu.above` `vram.above` `battery.below` |
| Always | `always` |

**What a rule can do when it fires:**

| Mod | Values |
|---|---|
| Threshold | a number, for the `.above` / `.below` signals |
| Ink | any colour |
| Ground | any colour |
| Border | full border object (edge, line, colour) |
| Blink target | `border` · `bg` · `fg` |
| Blink colour | any colour |
| Blink rate | 0.05–4 Hz |
| Bell | ring once when the incident **starts** |
| Escalate | override the hide rules while firing |

Later rules win, so you can layer a general rule and a specific override.

> Blink is derived from the **clock**, not the terminal's SGR blink attribute —
> so it looks identical everywhere and doesn't depend on a setting your emulator
> may quietly ignore.

### 4.7 Visibility *(per tile)*
| Mod | Meaning |
|---|---|
| `always` | the default |
| `only when…` | up to 8 signals — e.g. show CI **only** when it's failing |
| `except when…` | up to 8 signals — hide while the condition holds |

### 4.8 Responsive overrides *(per tile, per breakpoint)*
| Mod | Values |
|---|---|
| Hidden | on / off / inherit |
| Compact | on / off / inherit — drops the label and shortens the value |
| Style | any style field can be overridden at any breakpoint |

> **The trap worth documenting:** overrides are *sparse and inherited*. Setting
> `md: {}` means "inherit sm", not "reset to default". This bit me during the
> build and it belongs in any docs you write.

### 4.9 Priority and overflow *(per tile)*
| Mod | Values |
|---|---|
| Priority | an integer — **higher numbers drop first** |
| Flex | one tile per row may absorb leftover slack |

When the row won't fit, the solver drops **whole tiles by priority**. It never
wraps and never truncates mid-tile. Verified monotonic: a narrower terminal
never keeps more tiles. See `overflow-200col.png` → `overflow-64col.png`.

### 4.10 Rotation *(per row)*
Up to **4 rotation slots** per row; each holds **2–8 tiles** that share one
position, cycling `minute` / `hour` / `day`. Several low-priority tiles then
cost one tile's worth of columns. The choice comes from a clock bucket, so it
never flickers between renders.

### 4.11 Actions and drill-downs *(per tile)*
| Mod | Limit | Note |
|---|---|---|
| Action id | **≤ 15 bytes** | tmux's `range=user|` cap — validated at save, not at render |
| Drill id | ≤ 15 bytes | same cap |
| Drill command | argv array, 1–24 items | **never a shell string** |
| Drill title | any string | popup title |

Built-in media actions: `play_pause`, `next`, `prev`, `vol_up`, `vol_down`.

### 4.12 Sheet-level settings
| Mod | Values |
|---|---|
| Terminal background | `#rrggbb` — match your own terminal so the bar sits flush |
| Whole-bar fill | same 15 modes and parameters as a tile |
| Colour depth | `truecolor` (16.7M) · `ansi256` · `ansi16` |
| Nerd Font | on / off — unlocks the powerline cap |
| Named palette | any number of `name → colour` entries |
| Danger patterns | default `prod`, `production`, `prd`, `live` |
| Danger colour | default `#ff5f5f` |
| Protected branches | default `main`, `master`, `release` |
| Rows | 1–5 for Claude Code |
| Breakpoints | fully editable — add, remove, or move any threshold |

> Danger matching is **segment-based**, so `eks-prod-1` fires and `product-api`
> does not. That distinction is a genuine selling point for anyone who has ever
> run the wrong command against production.

---

## 5. The tile catalogue — all 68

**Cost tiers.** Every tile declares what it costs to compute, and nothing
expensive ever runs on the render path:

| Tier | Meaning |
|---|---|
| **T0** | free — already in the JSON on stdin |
| **T1** | a local file read |
| **T2** | a subprocess, cached |
| **T3** | sampled by the background daemon |
| **T4** | network — needs a credential |

### Session — 22 tiles
`model` `effort` `session-name` `session-duration` `cost` `context-bar`
`context-pct` `five-hour-bar` `seven-day` `lines-changed` `cc-version`
`vim-mode` `agent` *(all T0)*
`linear-assigned` `linear-started` `linear-review` `linear-triage`
`sentry-issues` `sentry-events` `deploy-status` `deploy-duration`
`deploy-url` *(T4)*

### Git — 14 tiles
`git-branch` *(T1)* · `git-counts` `git-ahead-behind` `git-last-commit`
`git-stash` `git-sha` `git-diff` *(T2)* · `worktree` `repo-slug` `pr` *(T0)* ·
`protected-branch` *(T1)* · `ci` `gh-pr-counts` `gh-issues` *(T4)*

### Environment — 18 tiles
`clock` `venv` `node-version` `python-version` `hostname` `aws-profile` *(T1)* ·
`cwd` *(T0)* · `battery` `kube-context` *(T2)* · `gcp-project` *(T4)* ·
`cpu` `memory` `swap` `disk` `load` `network` `gpu` `vram` *(T3)*

### Personal — 3 tiles
`verse` `track` *(T1)* · `skills` *(T2)*

### Media — 6 tiles
`now-playing` *(T2)* · `media-play` `media-prev` `media-next` `media-vol-up`
`media-vol-down` *(T1, clickable)*

### Layout — 5 tiles
`text` `spacer` `separator` `fill-band` *(T1)* · `command` *(T2, approval-gated)*

---

## 6. The 10 bundles

| Bundle | What it's for |
|---|---|
| **Minimal** | Model, context, branch. |
| **Session** | Everything the stdin JSON gives free. |
| **Full-stack dev** | Git and context, room for CI. |
| **War room** | Burn, cost, and what changed. |
| **Focus** | Clock and context, nothing else. |
| **Safety** | Only the things that stop accidents. |
| **SRE / on-call** | Cluster, cloud, CI and machine load. |
| **Data engineer** | Long jobs and the machine running them. |
| **Machine** | Everything the daemon samples. |
| **Mobile dev** | Build state and the branch it came from. |

The three **safety tiles** — `kube-context`, `aws-profile`, `protected-branch` —
are appended to every other bundle by default. They prevent accidents rather
than inform, and cost a handful of columns each.

## 7. The 5 themes
`Drafting` · `Blueprint` · `Silkscreen` · `Plain ink` · `16 colour`

`16 colour` exists for terminals without truecolor — it's a real constraint
mode, not a stylistic choice. → `themes.mp4`, `11-theme-*.png`

---

## 8. The CLI — 20 commands

| Command | What it does |
|---|---|
| `render` | read Claude Code's stdin JSON, print the status line |
| `tmux` | print a tmux format string for `status-left` / `status-right` |
| `tmux-conf` | print the `.tmux.conf` snippet, mouse binding included |
| `action <id>` | run a media action |
| `click <range>` | tmux click router |
| `view <id>` | run a tile's drill command |
| `refresh` | expire every cache |
| `approve` | review and approve the config's custom commands |
| `daemon` | loopback listener + metric sampler |
| `import <base64>` | write config and patch `~/.claude/settings.json` |
| `export` | print the current config as base64 |
| `creds list/set/rm` | manage API tokens |
| `action-url <id>` | print the daemon URL for an action |
| `tiles` | list every available tile |
| `doctor` | report what's misconfigured, and how to fix it |
| `widgets` | list declarative widget manifests and their errors |
| `search [term]` | search the widget registry |
| `add <id>` | install a registry widget (http-only, shows it first) |

**Extensibility:** third-party tiles can be added as declarative JSON manifests —
no code execution — and installed from a registry with `statusline add`.

---

## 9. Security posture — worth a section on the page

A status line runs on **every single message**, which makes it a genuinely bad
place to be careless. What the product does about that:

- **Commands are argv arrays, never shell strings.** Nothing in a config can
  smuggle in a metacharacter.
- **An approval gate keyed to the exact arguments.** A config can arrive as a
  pasted base64 blob, so any command it wants to run must be approved first —
  and editing the command revokes the approval.
- **Credentials must be `0600`** or they're refused, and they live in their own
  file, never in the config you paste into a chat.
- **`creds list` returns names only**, never values.
- **The daemon binds to 127.0.0.1** behind a token, with a fixed action allowlist.
- **Registry manifests are http-only** and shown to you before install.
- **Zero network calls on the render path.** The daemon samples; the renderer
  reads a cache.

---

## 10. Honest limits — please don't oversell these

Whoever writes the copy should know where the edges are:

1. **Flowing fills are not smooth in a terminal.** Claude Code's refresh floor
   is one second. Say "a slow pulse", not "60fps in your terminal".
2. **GIFs don't play.** A GIF becomes a rotating palette.
3. **A baked image is a colour field, not a photograph.** 96 × 8 cells.
4. **Metric tiles need the daemon running.** Without it they render nothing.
   `doctor` says so explicitly.
5. **Overline and coloured underlines need a modern terminal.** Ignored
   elsewhere, not garbled.
6. **The powerline cap needs a Nerd Font.**
7. **Linear, Sentry and Vercel are parsing-proven, not API-proven.** They work
   against fixtures and a stand-in server; they have never been pointed at the
   real endpoints. Don't claim "works with Linear" until someone's token proves it.
8. **The tmux physical click is unverified end to end.** The bar renders, the
   ranges survive, the binding registers and the dispatcher works — but nobody
   has yet clicked a tmux tile with a real mouse to close the loop.

---

## 11. Measured numbers you can quote

| Figure | Value | Caveat |
|---|---|---|
| Warm render, all tiles resolved | **48.5 ms** median, 50.5 p95 | budget is 100 ms; CI fails the build over it |
| Tiles | **68** | `statusline tiles` |
| Fill modes | **15** | |
| Signals | **26** | |
| CLI commands | **20** | |
| Bundles / themes | **10 / 5** | |
| Tests | **135** | 125 core + 10 CLI |
| Network calls on render path | **0** | architectural, not incidental |

---

## 12. Suggested page structure

If it helps, the strongest order for the story:

1. **Hero** — the live bar, and the width slider that drops tiles by priority.
   It's the one feature that explains itself in a single gesture.
2. **One engine, three targets** — the promise that the preview can't lie.
3. **The parts list** — 68 tiles, with the tier idea (nothing expensive on the
   render path).
4. **Make it yours** — 15 fills, images, borders, themes.
5. **Make it react** — 26 signals, the blinking red border on CI failure.
   This is the most *emotionally* legible feature; consider it for the hero
   if the slider doesn't land.
6. **It runs on every keystroke, so it behaves** — the security section.
7. **Price.**

The two assets that carry the most weight are `responsive-overflow.mp4`
and `blink-rule.mp4`. Everything else is supporting material.
