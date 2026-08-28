# statusline

One design, three render targets. A visual builder produces a config; a shared
core renders it identically to a Claude Code status line, a tmux status bar,
and the web preview.

## Status: all seven phases complete

| Phase | State |
|---|---|
| 1 — core: schema, width math, layout solver, ANSI adapter | **done** |
| 2 — web builder (The Drawing Sheet) | **done** |
| 3 — handoff: export/import, settings.json merge with diff | **done** |
| 4 — full tile catalog (46 tiles) + background caching | **done** |
| 5 — tmux target + `statusline action` | **done** |
| 6 — daemon (loopback, token, allowlist) | **done** |
| 7 — preset themes, gradients, undo/redo, capability greying | **done** |

## Layout

```
packages/
  core/   config schema (zod) · width math · layout solver · 46 tiles
          adapters: ansi (terminal) · tmux (format strings) · web (DOM values)
  cli/    render · tmux · action · daemon · import · export · tiles
  web/    the drawing-sheet builder; imports core, previews through it
```

`core` is pure: `(config, breakpoint, runtimeData) -> Span[]`. Adapters turn
spans into ANSI, tmux format strings, or DOM. The web preview will import the
same solver, not a CSS approximation.

## Try it

```bash
pnpm install && pnpm build

# render
echo '{"model":{"display_name":"Opus 5"},"context_window":{"used_percentage":23}}' \
  | COLUMNS=120 node packages/cli/dist/statusline.js render

# design it instead
pnpm --filter @statusline/web dev      # http://localhost:4321

# list what is available
node packages/cli/dist/statusline.js tiles
```

## Commands

| Command | Does |
|---|---|
| `render` | Reads Claude Code's stdin JSON, prints the rows |
| `tmux` | Prints a tmux format string for `status-left`/`status-right` |
| `tmux-conf` | Prints the `.tmux.conf` snippet (mouse + click binding) |
| `action <id>` | Runs a media action. tmux calls this directly — no HTTP |
| `daemon` | Loopback listener so Claude Code's OSC 8 links can reach actions |
| `import <b64>` | Writes the config, merges `~/.claude/settings.json`, shows a diff |
| `export` | Prints the config as base64, credentials stripped |
| `tiles` | Lists all 46 tiles with tier and category |

## Interaction differs by target

tmux dispatches real commands; Claude Code cannot. Its status line is captured
stdout, so the only interactive primitive is an OSC 8 hyperlink, which is why
the daemon exists at all. The same tile config produces both.

| Target | Mechanism | A click can |
|---|---|---|
| tmux | `#[range=user\|X]` + `MouseDown1Status` | run any allowlisted action |
| Claude Code | OSC 8 → loopback daemon | reach the same executor over HTTP |
| Web | DOM events | anything |

## Daemon security

It runs commands in response to HTTP, so: **127.0.0.1 only**, a token generated
at first run and stored `0600`, and a **fixed allowlist** — never a command
string from the URL. Verified: no token → 403, unknown action → 400, path
injection → 404, external interface → connection refused.

## Gotcha: sparse breakpoint overrides really are sparse

A breakpoint records only what *differs* from the next smaller one. So this
does **not** restore the full form at `md`:

```jsonc
{ "sm": { "compact": true }, "md": {} }   // md inherits sm -> still compact
```

Write the reset explicitly:

```jsonc
{ "sm": { "compact": true }, "md": { "compact": false } }
```

The solver is right; it is the config that lies. This bit the default config
during Phase 1 and every tile stayed compact at 240 columns.

## Non-negotiables held so far

- Warm render **55.7 ms** median, p95 67.3 (budget 100), with all 46 tiles.
  The CLI ships as a single esbuild bundle; unbundled module resolution alone
  cost ~24 ms on a command that runs on every message.
- Collection is gated on the tiles actually in the config: a sheet with no git
  tiles never spawns a git refresh, and the battery (which shells out) is read
  only when a battery tile exists.
- Never non-zero: a crash or non-zero exit blanks the bar, so the CLI degrades
  to the model name and still exits 0.
- Width is measured with ANSI/OSC 8 stripped, wide chars as 2, combining as 0.
  22 fixtures in `packages/core/test/fixtures.json`.
- `$COLUMNS` only. `tput cols` cannot work — Claude Code captures stdout.
- tmux `range=user|X` is capped at 15 **bytes**; the schema validates it.
