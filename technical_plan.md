# Harada Maker — Technical Plan

This document covers the technical design and stack for the Harada board maker. It builds on [plan.md](./plan.md). The current phase focuses **only on the grid** — no text, no labels, no copy on the page.

---

## 1. Stack

- **Build tool / dev server:** [Vite](https://vitejs.dev/) (vanilla, no framework for now — keep it lightweight).
- **Language:** TypeScript.
- **Styling:** Plain CSS (no UI library).
- **Backend:** None yet. Everything runs client-side.
- **Font:** [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts.
- **Color:** Fully **black and white** only. No color, no grays beyond what's needed for the grid lines/structure (kept to pure black/white where possible).

---

## 2. The Grid

The Harada board is a **9×9 grid (81 cells)** made of nine **3×3 blocks**. The structure mirrors the Harada method:

```diagram
╭───┬───┬───┬───┬───┬───┬───┬───┬───╮
│   │   │   │   │   │   │   │   │   │
├───┼───┼───┼───┼───┼───┼───┼───┼───┤   each bold 3×3 region
│   │   │   │   │   │   │   │   │   │   = one block
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │   │   │   │   center block = goal + 8 pillars
├───┼───┼───┼───┼───┼───┼───┼───┼───┤   outer 8 blocks = pillar + 8 actions
│   │   │   │   │   │   │   │   │   │
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │   │   │   │
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│   │   │   │   │   │   │   │   │   │
╰───┴───┴───┴───┴───┴───┴───┴───┴───╯
```

### Rendering approach
- A single square board container holding an **81-cell CSS grid** (`grid-template-columns: repeat(9, 1fr)`), kept perfectly square via aspect-ratio.
- **Pure squares**: every cell is a square; the whole board is a square. No rectangular cells at any zoom level.
- Visual distinction between the 3×3 blocks done with thicker borders between blocks vs. thinner borders inside a block (still black/white only).

---

## 3. Zoom & Navigation (mobile-first)

The core interaction challenge is letting users zoom into a dense 9×9 grid on a small screen **without** messy, free-form pinch-zoom that produces awkward off-center or half-cell views.

### Principles
- **Snappy, snapped zoom — not free-form.** Zoom levels are **discrete states**, not a continuous scale. The view always lands on clean, aligned square regions.
- **Two (or three) zoom levels:**
  1. **Whole board** — the full 9×9 grid fits the screen.
  2. **Block view** — zoomed to a single 3×3 block, perfectly aligned to that block's square bounds.
  3. *(optional later)* **Cell view** — zoomed to a single cell.
- **Tap to zoom in:** tapping a block snaps the view to that block. Tapping again (or a back gesture/control) snaps back out.
- **No partial views:** transitions always animate between aligned, square regions so the user never sees a weird cropped/tilted frame.
- **Smooth transitions:** use CSS transforms (`transform: scale()` + `translate`) with a short easing transition so zooming feels fluid but always resolves to a snapped target.

### Implementation idea
- Maintain a small zoom state: `{ level, focusedBlockIndex }`.
- Compute the target `transform` (scale + translate) so the focused block fills the viewport square, then apply via CSS transition.
- Disable the browser's native pinch-zoom on the board area (so our snapped zoom is the only zoom), via `touch-action` and viewport meta settings, to avoid conflicting free-form zoom.

---

## 4. Layout & Responsiveness

- The board is centered and sized to the largest square that fits the viewport (min of width/height), so it's fully visible on both phones and desktops.
- Mobile viewport configured (`<meta name="viewport">`) to prevent unwanted user-scaling that would conflict with our custom zoom.
- Everything scales with the board so cells stay square at every breakpoint.

---

## 5. Current Phase Scope (grid only)

**In scope now:**
- Vite + TypeScript project scaffold.
- Inter font loaded.
- Black & white styling.
- The 9×9 grid rendered as pure squares with block distinction.
- Snapped, smooth zoom interaction (whole board ⇄ block).

**Explicitly NOT in this phase:**
- No text/labels/copy anywhere on the page.
- No cell editing / typing.
- No data model for goals/pillars/actions.
- No auto-save / persistence.
- No export / print / share.
- No backend.

---

## 6. Project Structure (planned)

```diagram
haradamaker/
├── index.html          # viewport meta, Inter font link, root mount
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.ts         # entry: build grid, wire up zoom
│   ├── grid.ts         # render the 9×9 / 3×3 grid
│   ├── zoom.ts         # snapped zoom state + transforms
│   └── style.css       # black & white styles, grid, transitions
├── plan.md
└── technical_plan.md
```

---

## 7. Workflow

- **Commit as we go** — small, focused commits at each working milestone (scaffold, grid render, zoom, etc.).
