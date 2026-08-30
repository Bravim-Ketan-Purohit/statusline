# Reference

Generated from `packages/core`. Re-run `node scripts/gen-reference.mjs` after
adding a tile, a fill mode, a signal or an edge style.

## Tiles (59)

| id | tier | category | name |
|---|---|---|---|
| `aws-profile` | 1 | environment | AWS profile |
| `battery` | 2 | environment | Battery |
| `clock` | 1 | environment | Clock |
| `cpu` | 3 | environment | CPU usage |
| `cwd` | 0 | environment | Working directory |
| `disk` | 3 | environment | Disk used |
| `gcp-project` | 4 | environment | GCP project |
| `gpu` | 3 | environment | GPU usage |
| `hostname` | 1 | environment | Hostname |
| `kube-context` | 2 | environment | Kubernetes context |
| `load` | 3 | environment | Load average |
| `memory` | 3 | environment | Memory usage |
| `network` | 3 | environment | Network throughput |
| `node-version` | 1 | environment | Node version |
| `python-version` | 1 | environment | Python version |
| `swap` | 3 | environment | Swap in use |
| `venv` | 1 | environment | Active venv |
| `vram` | 3 | environment | VRAM usage |
| `ci` | 4 | git | CI status |
| `gh-issues` | 4 | git | Open issues |
| `gh-pr-counts` | 4 | git | Repo PR counts |
| `git-ahead-behind` | 2 | git | Ahead / behind |
| `git-branch` | 1 | git | Git branch |
| `git-counts` | 2 | git | Git file counts |
| `git-diff` | 2 | git | Uncommitted diff |
| `git-last-commit` | 2 | git | Last commit age |
| `git-sha` | 2 | git | Commit SHA |
| `git-stash` | 2 | git | Stash count |
| `pr` | 0 | git | Branch PR |
| `protected-branch` | 1 | git | Protected branch warning |
| `repo-slug` | 0 | git | Repo slug |
| `worktree` | 0 | git | Worktree |
| `command` | 2 | layout | Custom command |
| `fill-band` | 1 | layout | Fill band |
| `separator` | 1 | layout | Flex separator |
| `spacer` | 1 | layout | Spacer |
| `text` | 1 | layout | Custom text |
| `media-next` | 1 | media | Next track |
| `media-play` | 1 | media | Play / pause |
| `media-prev` | 1 | media | Previous track |
| `media-vol-down` | 1 | media | Volume down |
| `media-vol-up` | 1 | media | Volume up |
| `now-playing` | 2 | media | Now playing |
| `skills` | 2 | personal | Suggested skills |
| `track` | 1 | personal | Playlist track |
| `verse` | 1 | personal | Scripture verse |
| `agent` | 0 | session | Agent |
| `cc-version` | 0 | session | Claude Code version |
| `context-bar` | 0 | session | Context window bar |
| `context-pct` | 0 | session | Context percentage |
| `cost` | 0 | session | Session cost |
| `effort` | 0 | session | Thinking effort |
| `five-hour-bar` | 0 | session | 5h limit bar |
| `lines-changed` | 0 | session | Lines added/removed |
| `model` | 0 | session | Model |
| `session-duration` | 0 | session | Session duration |
| `session-name` | 0 | session | Session name |
| `seven-day` | 0 | session | 7d limit |
| `vim-mode` | 0 | session | Vim mode |

## Fill modes (15)

| mode | what it does |
|---|---|
| `linear` | A straight ramp at any angle. |
| `radial` | Out from an origin you can move. |
| `conic` | Swept around the origin like a radar. |
| `diamond` | Manhattan distance; hard rhombic bands. |
| `wave` | A ramp bent by a sine along the rows. |
| `ripple` | Concentric rings travelling outward. |
| `spiral` | Conic and radial combined; it winds. |
| `barber` | Repeating diagonal stripes that climb. |
| `comet` | One bright head with a trailing falloff. |
| `scan` | A single band sweeping edge to edge. |
| `plasma` | Summed sines; the classic demoscene field. |
| `pulse` | The whole bar moves through the ramp at once. |
| `breathe` | Like pulse but eased, so it swells. |
| `rainbow` | Ignores the stops and rotates hue. |
| `strobe` | Snaps between stops with no blend. |

## Signals (26)

Used by rules, `hideWhen` and `showOnlyWhen`. A signal whose data is absent
always returns false, so a missing sampler never fires a threshold.

| signal | threshold | fires when |
|---|---|---|
| `ci.failing` | — | The latest run on this branch concluded in failure. |
| `ci.passing` | — | The latest run concluded successfully. |
| `ci.running` | — | A run is queued or in progress. |
| `pr.approved` | — | The open PR is approved. |
| `pr.changes` | — | A reviewer requested changes. |
| `pr.pending` | — | The PR is open and awaiting review. |
| `pr.open` | — | Any open PR exists for this branch. |
| `git.conflict` | — | At least one conflicted path. |
| `git.dirty` | files (default 1) | Modified or untracked files above the count. |
| `git.ahead` | commits (default 1) | Ahead of upstream by at least this many. |
| `git.behind` | commits (default 1) | Behind by at least this many. |
| `git.clean` | — | Nothing staged, modified, untracked or conflicted. |
| `context.above` | % (default 80) | Context window usage crosses this percentage. |
| `fivehour.above` | % (default 80) | The five-hour window crosses this percentage. |
| `sevenday.above` | % (default 80) | The seven-day window crosses this percentage. |
| `cost.above` | $ (default 20) | Session spend crosses this many dollars. |
| `battery.below` | % (default 20) | Battery drops under this percentage, unplugged. |
| `review.waiting` | — | Pull requests are awaiting your review. |
| `cpu.above` | % (default 85) | Sampled CPU crosses this percentage. |
| `mem.above` | % (default 85) | Memory in use crosses this percentage of total. |
| `swap.above` | MB (default 512) | Swap in use crosses this many megabytes. |
| `disk.above` | % (default 90) | Disk used crosses this percentage. |
| `load.above` | load (default 8) | One-minute load average crosses this value. |
| `gpu.above` | % (default 90) | GPU utilisation crosses this percentage. |
| `vram.above` | % (default 90) | VRAM in use crosses this percentage of total. |
| `always` | — | Unconditional; useful for a steady accent. |

## Border edges (7)

An edge is characters and costs columns, which the solver measures. A line
(underline / overline) is SGR and costs none.

| edge | columns | note |
|---|---|---|
| `none` | 0 |  |
| `thin` | 2 |  |
| `block` | 2 |  |
| `bracket` | 2 |  |
| `round` | 2 |  |
| `angle` | 2 |  |
| `powerline` | 2 | needs a Nerd Font |

## Targets

| target | note |
|---|---|
| Claude Code | Captured stdout. Multi-row, OSC 8 links, no click. |
| tmux | One line. Real click dispatch, no hyperlinks. |
| Web preview | The builder canvas. Everything works here. |
