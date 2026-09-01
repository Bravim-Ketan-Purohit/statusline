# Asset Manifest

Everything here was captured from the running application and the real CLI —
no mockups, no placeholder data. The video shows a **synthetic cursor with
eased, human-paced motion**, so the clips read as someone using the app rather
than a script driving it. The terminal shots are genuine ANSI from
`statusline render`, including live git state and daemon-sampled metrics.

```
assets/
  video/         9 clips — webm + mp4 + poster.jpg
  screenshots/   24 PNG stills of the builder, 2× retina
  terminal/      16 real CLI renders (.ans source + .png)
```

## Video — the main deliverable

Every clip ships three ways: `.webm` (source), `.mp4` (H.264, universal),
and `-poster.jpg`. All are silent and loop cleanly.

| Clip | Length | Size | mp4 | What it shows |
|---|---|---|---|---|
| `video/background-fills` | 34.60s | 1280×800 | 1149 KB | All 15 fill modes applied to the whole bar with flowing on, ~1.5s each. The 'make it move' clip. |
| `video/bar-loop` | 22.00s | 1030×96 | 317 KB | **Cropped to the bar alone, 1030×96, no cursor and no UI.** Made to sit in a hero as a living design element — drop it behind or beside a headline and loop it. |
| `video/blink-rule` | 12.68s | 1280×800 | 628 KB | Selecting a tile, adding a rule, choosing `ci.failing`, and the border blinking red. |
| `video/drag-and-drop` | 17.36s | 1280×800 | 852 KB | Three tiles dragged from the parts list onto three different rows. The core build gesture. |
| `video/hero-build-short` | 21.00s | 1280×800 | 585 KB | A 21-second cut of the same take, starting at the background gradient. For above the fold, where 48 seconds is too long. |
| `video/hero-build` | 47.88s | 1600×1000 | 2361 KB | **The main demo.** A full build, start to finish: dragging two tiles in, selecting one and giving it a rounded border, clicking the bar to open the background inspector, turning on a flowing gradient, cycling five fill modes, then dragging the width handle so tiles drop and return. 1600×1000 native. |
| `video/image-crop` | 16.68s | 1280×800 | 940 KB | Uploading an image, the profile-photo-style crop with a zoom slider, then applying it to the bar. |
| `video/responsive-overflow` | 10.88s | 1280×800 | 641 KB | The width handle dragged narrow and back. Tiles drop by priority (6 → 3) and return. |
| `video/themes` | 16.04s | 1280×800 | 714 KB | All five themes clicked through on the live bar. |

### Embedding

```html
<video autoplay loop muted playsinline
       poster="assets/video/hero-build-short-poster.jpg"
       width="1280">
  <source src="assets/video/hero-build-short.mp4" type="video/mp4">
  <source src="assets/video/hero-build-short.webm" type="video/webm">
</video>
```

`autoplay muted playsinline` is required or iOS opens the clip fullscreen
instead of playing it inline. Keep `muted` — the clips have no audio track
and browsers block unmuted autoplay regardless.

### Which clip for which job

| Job | Use |
|---|---|
| Hero, above the fold | `bar-loop` behind or beside the headline, or `hero-build-short` |
| "See it work" section | `hero-build` (the full 48s take) |
| Explaining overflow | `responsive-overflow` — the clearest single idea in the product |
| Explaining rules | `blink-rule` — the most emotionally legible feature |
| Explaining customisation | `background-fills`, then `themes` |
| Explaining the build gesture | `drag-and-drop` |

## Screenshots

| File | Size | Dimensions | What it shows |
|---|---|---|---|
| `screenshots/01-builder-overview.png` | 449 KB | 3200×2000 | The whole builder: parts list, drawing sheet, inspector, title block. |
| `screenshots/02-parts-list.png` | 111 KB | 436×1766 | The 68-tile parts list with tier badges (T0–T4). |
| `screenshots/03-specimen-bar.png` | 45 KB | 2320×190 | Just the rendered status bar, no chrome. Good inline beside body copy. |
| `screenshots/04-layer-schedule.png` | 33 KB | 1040×372 | Per-breakpoint table: columns, tiles drawn, tiles dropped, columns used. |
| `screenshots/05-background-inspector.png` | 135 KB | 576×1766 | Sheet inspector, including the per-target capability readout. |
| `screenshots/06-tile-inspector.png` | 111 KB | 576×1766 | The tile inspector: annotation, pens, fill, image import, borders. Best single 'you can change everything' shot. |
| `screenshots/07-fill-editor.png` | 61 KB | 576×1766 | Fill editor with mode, stops, angle, origin, flowing, speed, scale, palette rotation. |
| `screenshots/08-fill-comet.png` | 43 KB | 2320×190 | The bar with a comet fill. |
| `screenshots/08-fill-plasma.png` | 43 KB | 2320×190 | The bar with a plasma fill. |
| `screenshots/08-fill-ripple.png` | 43 KB | 2320×190 | The bar with a ripple fill. |
| `screenshots/08-fill-spiral.png` | 43 KB | 2320×190 | The bar with a spiral fill. |
| `screenshots/09-rules-editor.png` | 121 KB | 576×1766 | Rules editor: signal, threshold, colours, border, blink target/colour/rate, escalate, bell. |
| `screenshots/10-breakpoint-2xl.png` | 56 KB | 3696×190 | At 2xl (≥220). |
| `screenshots/10-breakpoint-lg.png` | 34 KB | 2016×190 | At lg (≥120). |
| `screenshots/10-breakpoint-md.png` | 33 KB | 1344×190 | At md (≥80). |
| `screenshots/10-breakpoint-sm.png` | 8 KB | 672×190 | At sm (≥40) — compact, labels dropped. |
| `screenshots/10-breakpoint-xl.png` | 55 KB | 2688×190 | At xl (≥160). |
| `screenshots/10-breakpoint-xs.png` | 15 KB | 470×190 | The bar at xs (≥0 cols). |
| `screenshots/11-theme-16-colour.png` | 31 KB | 2016×190 | 16-colour theme — the constraint mode for terminals without truecolor. |
| `screenshots/11-theme-blueprint.png` | 32 KB | 2016×190 | Blueprint theme. |
| `screenshots/11-theme-drafting.png` | 34 KB | 2016×190 | Drafting theme. |
| `screenshots/11-theme-plain-ink.png` | 23 KB | 2016×190 | Plain ink theme. |
| `screenshots/11-theme-silkscreen.png` | 34 KB | 2016×190 | Silkscreen theme. |
| `screenshots/12-full-sheet-final.png` | 430 KB | 3200×2000 | Full builder after edits. Alternate hero still. |

## Terminal — real CLI output

`.ans` files are raw ANSI: `cat` one into a terminal and it renders.
`.png` files are those bytes rendered at 15px JetBrains Mono on `#16181c`.

| Config | Widths | What it shows |
|---|---|---|
| `terminal/everyday-*` | 200c, 140c, 100c, 64c | Three rows: time/model/dir/branch with borders, then budget, then live machine metrics. The realistic 'what you'd actually run' shot. |
| `terminal/overflow-*` | 200c, 140c, 100c, 64c | One row of 11 ranked tiles. Compare the four widths to show priority overflow and compact mode. |
| `terminal/machine-*` | 200c, 140c, 100c, 64c | Daemon-sampled metrics only: cpu, mem, swap, disk, load, net, battery. |
| `terminal/showcase-*` | 200c, 140c, 100c, 64c | Flowing gradient on the whole bar, rounded and bracketed borders, a CI tile carrying a blink rule. |

### The overflow sequence tells the story on its own

```
terminal/overflow-200col.png    all 11 tiles
terminal/overflow-140col.png    all 11 tiles, tighter
terminal/overflow-100col.png    the metrics drop away
terminal/overflow-64col.png     compact: labels gone, values shortened
```

## Before you publish

The terminal shots contain this machine's real branch name, directory and
hardware metrics. Nothing obviously sensitive, but worth a look.

Regenerate any of this by re-running the capture scripts against a local
`vite build` of `packages/web` served on port 4321.
