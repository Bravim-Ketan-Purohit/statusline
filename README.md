# statusline

One design, three render targets. A visual builder produces a config; a shared
core renders it identically to a Claude Code status line, a tmux status bar,
and the web preview.

## Status: Phase 1 complete

| Phase | State |
|---|---|
| 1 — core (schema, width math, layout solver, ANSI adapter, 6 tiles, `statusline render`) | **done** |
| 2 — web builder | not started |
| 3 — handoff (export/import, settings.json merge) | not started |
| 4 — full tile catalog | not started |
| 5 — tmux target + action executor | not started |
| 6 — daemon | not started |
| 7 — polish | not started |

## Layout

```
packages/
  core/   config schema (zod) · width math · layout solver · ANSI adapter · tile registry
  cli/    reads Claude Code stdin JSON, resolves Tier-1 local data, prints rows
```

`core` is pure: `(config, breakpoint, runtimeData) -> Span[]`. Adapters turn
spans into ANSI, tmux format strings, or DOM. The web preview will import the
same solver, not a CSS approximation.

## Try it

```bash
pnpm install && pnpm build
echo '{"model":{"display_name":"Opus 5"},"context_window":{"used_percentage":23}}' \
  | COLUMNS=120 node packages/cli/dist/index.js render
```

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

- Warm render **49.8 ms** median (budget 100). `pnpm bench` fails the build past it.
- Never non-zero: a crash or non-zero exit blanks the bar, so the CLI degrades
  to the model name and still exits 0.
- Width is measured with ANSI/OSC 8 stripped, wide chars as 2, combining as 0.
  22 fixtures in `packages/core/test/fixtures.json`.
- `$COLUMNS` only. `tput cols` cannot work — Claude Code captures stdout.
- tmux `range=user|X` is capped at 15 **bytes**; the schema validates it.
