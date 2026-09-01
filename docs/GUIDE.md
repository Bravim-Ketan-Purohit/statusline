# Guide

Install, the four concepts that explain everything else, and the recipes people
actually ask for. For the generated tables of every tile, fill, signal and edge,
see [REFERENCE.md](REFERENCE.md).

---

## Install

```bash
git clone https://github.com/Bravim-Ketan-Purohit/statusline
cd statusline
pnpm install && pnpm build
```

Check it renders before wiring anything up:

```bash
echo '{"model":{"display_name":"Opus 5"}}' \
  | COLUMNS=140 node packages/cli/dist/statusline.js render
```

### Wire it into Claude Code

Design a bar in the builder, press **Copy install**, paste the command. Or by hand:

```bash
node packages/cli/dist/statusline.js import "$(cat my-config.b64)"
```

`import` patches `~/.claude/settings.json`. It reads the existing file, changes
only the `statusLine` key, and **shows you a diff before writing**. If something
else already owns that key it stops and asks.

### Wire it into tmux

```bash
node packages/cli/dist/statusline.js tmux-conf >> ~/.tmux.conf
tmux source-file ~/.tmux.conf
```

That snippet enables mouse mode and registers the click binding, so tiles with
an `action` or `drill` become clickable.

### If something's wrong

```bash
statusline doctor
```

It checks the config parses, the settings file points where you think, the
daemon is running if any tile needs it, and every custom command is approved —
and tells you the fix, not just the fault.

---

## Four concepts

Everything else follows from these.

### 1. Tiles declare what they cost

A status line runs on **every message**. So each tile declares a tier, and
nothing above T2 ever touches the render path.

| Tier | Cost | Example |
|---|---|---|
| T0 | free — already on stdin | `model`, `cwd`, `cost` |
| T1 | one local file read | `git-branch`, `clock` |
| T2 | a subprocess, cached | `git-diff`, `battery` |
| T3 | sampled by the daemon | `cpu`, `memory`, `network` |
| T4 | network, needs a credential | `ci`, `sentry-issues` |

T3 tiles render **nothing** unless `statusline daemon` is running. That's not a
bug — sampling on render would make "CPU usage since last message" the metric,
which is meaningless. Start it once:

```bash
statusline daemon &
```

### 2. Priority decides what survives

Terminals resize. Every tile carries a `priority` integer, and when the row
won't fit the solver drops **whole tiles, highest number first**. It never wraps
and never truncates mid-tile.

```
priority 1  ← last to go   (branch, context)
priority 9  ← first to go  (clock, battery)
```

Guaranteed monotonic: a narrower terminal never keeps more tiles.

### 3. Breakpoints inherit sparsely

Six by default — `xs ≥0`, `sm ≥40`, `md ≥80`, `lg ≥120`, `xl ≥160`, `2xl ≥220`.

An override only records what *differs* from the next smaller breakpoint:

```jsonc
"responsive": {
  "priority": 3,
  "sm": { "compact": true },     // from 40 cols up: drop the label
  "md": { "compact": false }     // from 80 cols up: put it back
}
```

> **The trap.** `"md": {}` means *inherit sm*, not *reset to default*. If
> everything looks compact at 200 columns, this is why.

### 4. Signals drive appearance

26 closed-enum signals. Bind one to a colour, a border, a blink, or to
visibility:

```jsonc
"style": {
  "showOnlyWhen": [{ "signal": "ci.failing" }],   // invisible until it matters
  "rules": [{
    "signal": "ci.failing",
    "blink": { "target": "border", "color": "#ff5f5f", "hz": 2 },
    "bell": true
  }]
}
```

Later rules win, so layer a general rule then override it.

---

## Recipes

### Show CI only when it's broken

```jsonc
{ "type": "ci", "style": { "showOnlyWhen": [{ "signal": "ci.failing" }] } }
```

Costs zero columns on a good day.

### Stop yourself running things against production

```jsonc
{ "type": "kube-context" }, { "type": "aws-profile" }, { "type": "protected-branch" }
```

The danger match is **segment-based**, so `eks-prod-1` reddens and
`product-api` doesn't. Add your own words under `theme.dangerPatterns`.

### Warn before the context window runs out

```jsonc
{ "type": "context-bar", "style": { "rules": [
  { "signal": "context.above", "threshold": 75, "fg": "#e0a44a" },
  { "signal": "context.above", "threshold": 90, "fg": "#d9604e", "bell": true }
]}}
```

### Rotate several low-value tiles through one slot

```jsonc
"rotation": [{ "tiles": ["verse", "track", "skills"], "every": "minute" }]
```

Three tiles, one tile's worth of columns. The choice comes from a clock bucket
so it never flickers mid-session.

### Make the whole bar flow

```jsonc
"theme": { "terminalFill": {
  "kind": "gradient", "mode": "plasma", "animated": true, "speed": 0.3,
  "stops": [{ "color": "#2b0b52", "pos": 0 }, { "color": "#7b2ff7", "pos": 1 }]
}}
```

In Claude Code this is a **slow pulse** — the refresh floor is one second.
The web preview animates properly.

### Add a tile that runs your own command

```jsonc
{ "type": "command", "props": { "argv": ["kubectl", "get", "po", "-o", "name"] } }
```

Argv array, never a shell string. Then approve it once:

```bash
statusline approve
```

Editing the command revokes the approval — that's the point.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Bar is blank | The script exited non-zero. Run `statusline render` by hand and read stderr. |
| Metric tiles empty | The daemon isn't running. `statusline daemon &` |
| Everything compact at wide widths | A sparse override — see concept 3. |
| A custom command does nothing | Not approved. `statusline approve` |
| Powerline caps show as boxes | Needs a Nerd Font. |
| Overline ignored | Your terminal doesn't support it. It's dropped, not garbled. |
| tmux tiles not clickable | `tmux-conf` snippet not sourced, or mouse mode off. |
| T4 tiles empty | No credential. `statusline creds set <name>` |

---

## Deploying your own copy of the site

The repo builds a static site — landing page, docs and the builder:

```bash
pnpm build:site      # → dist-site/
pnpm preview:site    # → http://localhost:5000
```

On Vercel: import the repo and accept the detected settings. `vercel.json`
already sets the build command, output directory and cache headers. No
environment variables and no server runtime — it's fully static.

### Demo video

The recordings are **not in git** — they'd add megabytes to every clone
forever. They live on a GitHub Release instead, and the build rewrites the
`{{MEDIA}}` token in the HTML to point at them.

```bash
pnpm media:publish     # uploads landing-kit/assets/video/*.mp4 to the release
pnpm media:check       # HEADs every URL the built site references
```

`site.config.json` is the single place that defines where media is served
from, so moving to a real CDN later is a one-line change rather than a
find-and-replace through the markup.

The build **succeeds without the video present** — which is what the Vercel
checkout looks like, since the files are gitignored. Posters stay committed
because they're what paints before the remote video arrives.
