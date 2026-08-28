---
name: statusline
description: A terminal status line designed as a dimensioned mechanical drawing.
colors:
  sheet: "#e6e0d2"
  sheet-deep: "#dbd4c2"
  sheet-edge: "#cfc7b3"
  ink: "#23231f"
  ink-2: "#55524a"
  dim: "#6f6a5c"
  rule: "#a9a18e"
  pen-xs: "#c2452d"
  pen-sm: "#b3701a"
  pen-md: "#2f7d8c"
  pen-lg: "#4a7a2e"
  pen-xl: "#7d3f8c"
  pen-2xl: "#2b4c8c"
typography:
  sheet-title:
    fontFamily: "Archivo Narrow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.18em"
  region-label:
    fontFamily: "Archivo Narrow, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.2em"
  body:
    fontFamily: "Archivo Narrow, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  figure:
    fontFamily: "JetBrains Mono Variable, ui-monospace, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.02em"
  specimen:
    fontFamily: "JetBrains Mono Variable, ui-monospace, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
rounded:
  none: "0px"
spacing:
  hair: "1px"
  dim: "1.5px"
  edge: "2px"
  pad: "22px"
components:
  button:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "6px 12px"
    typography: "{typography.region-label}"
  button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
  button-disabled:
    textColor: "{colors.dim}"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "5px 7px"
    typography: "{typography.figure}"
  layer-tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.none}"
    padding: "0 16px"
  schedule-cell:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "3px 8px"
    typography: "{typography.figure}"
---

# statusline — design system

## Overview

The surface is a working mechanical drawing whose dimensioned quantity is width
in columns. Warm vellum ground, graphite linework, and six CAD layer pens keyed
to the responsive breakpoints. The one dark region on the sheet is the specimen:
the actual terminal render, on the user's own configured terminal background,
sitting on the drawing field the way a pasted print sits on a drafting sheet.

Chrome is light so the specimen can be any darkness the user chooses without
costing the editor its legibility. That is a functional constraint, not a mood.

## Colors

Strategy: **full palette** — a neutral vellum system plus six layer pens used as
identity, not decoration. The active layer's pen propagates through the whole
sheet via `--pen`: the tab, the schedule's active row, focus rings, the checkbox,
the primary action. Changing layer visibly re-inks the drawing.

### Primary
`sheet #e6e0d2` is the ground. `ink #23231f` is the linework and body text
(12.4:1 on sheet). `ink-2 #55524a` carries secondary text at 5.9:1.

### Secondary
The six pens are ordered by breakpoint, not by hue preference:
`xs #c2452d`, `sm #b3701a`, `md #2f7d8c`, `lg #4a7a2e`, `xl #7d3f8c`, `2xl #2b4c8c`.

### Neutral
`sheet-deep #dbd4c2` is the drawing field, one step down from the sheet.
`dim #6f6a5c` draws dimension and witness lines at 4.1:1 — above the 3:1 graphics
floor, which is why it is not lighter. `rule #a9a18e` is hairline-only and never
carries text.

### Named Rules
- **Layer pen propagation.** Set `--pen` once on `.sheet`; every accent inherits.
- **Dim is a line colour, not a text colour.** Text uses `ink` or `ink-2`.
- **Warning uses `pen-xs`**, which doubles as the smallest layer's pen. Red means
  "something dropped here", in both readings.

## Typography

Two faces, both self-hosted. `Archivo Narrow` is the drafting lettering: condensed,
uppercase, widely tracked for labels. `JetBrains Mono` carries every figure, every
column count, and the specimen itself.

### Hierarchy
| Role | Face | Size | Tracking |
|---|---|---|---|
| Sheet title | Archivo Narrow 600 | 15px | 0.18em, uppercase |
| Region label | Archivo Narrow 400 | 11px | 0.2em, uppercase |
| Body | Archivo Narrow 400 | 14px | normal |
| Figure | JetBrains Mono | 10–11px | tabular-nums |
| Specimen | JetBrains Mono | 13px | ligatures off |

### Named Rules
- **Mono means measurement.** Monospace is reserved for figures, column counts,
  and the terminal specimen. It is never a texture for "technical".
- **All figures are `font-variant-numeric: tabular-nums`**, so numbers do not
  shift as they change.
- **Percentages are padded to three characters** so a bar's readout holds its
  column from 0% to 100%.

## Layout

Three regions across the sheet body: parts list (218px), drawing field
(`minmax(0, 1fr)`), detail callout (288px), under a header of layer tabs and over
a title block. Below 1080px the sheet folds to one column and the field scrolls
as a whole.

### Named Rules
- **`minmax(0, 1fr)`, never bare `1fr`.** A bare `1fr` is `minmax(auto, 1fr)` and
  refuses to shrink below the drawing's min-content, which overflows the sheet.
- **The drawing has a height floor** (`min-height: 196px` on the scroll region).
  A clipped specimen contradicts the claim that it is drawn at true size.
- **The dimension line and the specimen share one wrapper** so the figure always
  describes the object directly beneath it.
- Spacing rhythm is `--sheet-pad: 22px` horizontally; more space above a heading
  than below it.

## Elevation & Depth

There is none, deliberately. A drawing sheet is flat. Depth is expressed through
three fixed line weights — `1px` hairline, `1.5px` dimension, `2px` sheet edge —
and through the one recessed field (`sheet-deep`). No shadows anywhere.

## Shapes

Radius is `0` everywhere. Every container is a ruled rectangle. The only curve in
the system is the detail callout's leader bubble, a 7px circle at `1.5px` stroke,
which is the drawing convention for tying a detail to its part.

## Components

### Buttons
Square, hairline-bordered, uppercase Archivo Narrow at 0.12em. Hover inverts to
`ink` ground with `sheet` text. Disabled drops to `dim` with a `rule` border.
The primary action variant swaps the border and text to `--pen` and inverts to
the pen on hover.

### Inputs / Fields
Square, `rule` border, `sheet` ground, mono text. Focus swaps the border to
`--pen`. Disabled inputs get a tinted ground and are always paired with a
`.cap-note` stating **why** they are unavailable.

### Layer tabs
A column of id over threshold with a 3px pen stripe beneath at 28% opacity,
rising to full opacity when selected. Below 1080px the threshold figure is
dropped and tabs flex to fit rather than scrolling out of sight.

### Schedule
`table-layout: fixed`. Header labels in Archivo Narrow, all figures right-aligned
mono. The active row tints with `--pen` at 16%. Under 640px the derived `USED`
column is dropped rather than clipped.

### Tri-state control
Three segmented buttons, `inherit / off / on`. This exists because a checkbox
lies about sparse breakpoint inheritance: an unset override inherits from the
next smaller layer, which is not the same as `false`.

### Ghost cells
A dropped tile keeps its place at 26% opacity, grayscaled, with a dashed rule
struck through it. Absence is drawn as deliberately as presence.

## Do's and Don'ts

**Do** theme the browser's own surfaces — selection, caret, scrollbars, focus
rings, checkboxes are all painted from the palette. That is the cheapest signal
the page was built rather than assembled.

**Do** state why a control is disabled. Capability limits surface as a note,
never as a silent no-op the user discovers later in a terminal.

**Don't** animate `width`. The drawing must track the width handle exactly, and
an eased width both thrashes layout and hides the drop points that are the
information.

**Don't** add radius, shadows, or gradients to chrome. Gradients exist in this
product only as a *tile* property the user configures, rendered inside the
specimen — never as sheet decoration.

**Don't** use unicode glyphs as icons. The icon set is authored SVG on one 1.5px
stroke at 16px.
