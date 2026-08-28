# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

pnpm monorepo, TypeScript throughout. `packages/core` is a pure, dependency-light
renderer (zod only); `packages/cli` consumes it for terminals; `packages/web` is
this builder. React for the builder. **No backend** — everything runs client-side
and persists to localStorage. The exported config is the only artifact.
Runs locally via `pnpm dev` now; a hosted static deployment is planned but its
entry surface is deliberately undecided.

## Users

Developers who live in a terminal all day and want their status line to carry more
than a branch name. They arrive from day one as strangers, not just the author —
someone who found the tool and wants to design a bar without reading a schema
reference first. The job: assemble a status line visually, see exactly what it will
look like at every terminal width, and leave with a config that renders identically
in Claude Code and tmux.

## Product Purpose

One design, three render targets, no manual re-implementation between them. A
designer-grade editor for something that has only ever been hand-edited JSON and
shell scripts. Success is a user who designs a layout in the browser, pastes one
command, and sees the same thing in their terminal — with no surprises between the
preview and the real output.

## Positioning

The preview is not an approximation. `packages/core` is the single renderer: the
web canvas, the ANSI terminal output, and the tmux format string all come from the
same layout solver, the same width math, and the same drop decisions. Competing
tools either hand-edit config with no preview, or preview in CSS that drifts from
the terminal within a week. This one cannot drift, because there is only one
implementation.

## Operating Context

Users work in Ghostty, iTerm2, kitty, WezTerm, and tmux, at widths from a 240px
split pane (~28 columns) to a 32" 4K panel (~457 columns). They are colour-scheme
particular and will want the canvas to match their own terminal background while
designing. Terminals measure in columns, not pixels; the builder must show both.
Terminal capability is not uniform — truecolour, 256-colour, and 16-colour targets
all exist, and tmux can dispatch real click actions while Claude Code can only open
an OSC 8 hyperlink.

## Capabilities and Constraints

- Three panes: tile palette, canvas, inspector. Drag from palette to canvas,
  reorder within canvas, move between rows.
- Responsive model has two composing mechanisms: declared per-breakpoint overrides
  (hidden / compact / restyle) and priority-based overflow that drops whole tiles.
  Never wrap, never truncate mid-tile.
- Breakpoint switcher plus a free-drag resize handle for continuous scrubbing from
  240px to ~3840px, showing pixel width and column count together.
- Per-tile background, foreground, and optional two-stop horizontal gradient. A
  global terminal background colour the canvas renders against.
- Colour mode (truecolor / ansi256 / ansi16) **quantizes the preview** so the real
  downgrade is visible, not the truecolour version.
- Capability matrix: controls the selected target cannot do are disabled with a
  stated reason, never silently non-functional.
- Named bundles (Minimal, Session, Full-stack dev, SRE/on-call, Indie hacker, Data
  engineer, Mobile dev, Focus, Safety, War room) applied in one click, then edited.
  The Safety bundle appends to every other bundle by default.
- Undo/redo and autosave to localStorage.
- **No image fills anywhere**, including the preview — nothing may be designed in
  the builder that cannot exist in a terminal.
- Export by copy-install-command (base64), download JSON, or copy raw JSON. Import
  merges `~/.claude/settings.json` rather than overwriting, showing a diff first.
- Undecided: the hosted entry surface, and whether the widget registry from
  Appendix B ever ships.

## Brand Commitments

Name: **statusline**. No logo, wordmark, colour, or typeface has been chosen — the
visual world is open. The one binding constraint is honesty of preview: the builder
must never show something the terminal cannot render.

## Evidence on Hand

- Working Phase 1 renderer at `packages/core` and `packages/cli`, 21 passing tests,
  22 width fixtures at `packages/core/test/fixtures.json`.
- A real config shape and a working six-tile default layout at
  `packages/cli/src/defaultConfig.ts`.
- A full widget catalog spanning ~250 integrations across two appendix documents,
  organised by data tier.
- No users, no testimonials, no benchmarks, no pricing, no deployment. None of
  these may be fabricated. The tool has never been used by anyone but its author.

## Product Principles

1. **The preview cannot lie.** One renderer, one width math, one set of drop
   decisions. If the canvas and the terminal disagree, the product has failed.
2. **Never design what cannot render.** Capability limits surface as disabled
   controls with reasons, not as silent no-ops discovered later in a terminal.
3. **Columns are the unit.** Pixels are a convenience of the canvas; every stored
   breakpoint and every layout decision is in columns.
4. **Degrade by dropping, never by mangling.** Whole tiles disappear in priority
   order; nothing wraps and nothing truncates mid-tile.
5. **The config is the only artifact.** No backend, no account, no lock-in — a JSON
   file the user owns and can paste anywhere.

## Accessibility & Inclusion

No standard has been made binding. Two product-specific needs are known: the
editor must remain usable when the user has picked a low-contrast terminal
background for the canvas (canvas theming must not bleed into chrome legibility),
and colour is the primary encoding of the thing being designed, so state in the
editor's own UI must not rely on hue alone.
