import type { BoardElements } from "./grid.ts";

// Discrete, snapped zoom: either the whole 9x9 board, or a single 3x3 block
// scaled to fill the viewport. No free-form zooming — the view always lands
// on a clean, square-aligned region.
//
// Interaction model:
//   - board view: tapping a block snaps the view to that block (no editing).
//   - block view: tapping a cell focuses it for typing; Escape or tapping
//     outside the board snaps back out to the whole board.

type ZoomState = { level: "board" } | { level: "block"; index: number };

export function initZoom({ viewport, board }: BoardElements): void {
  let state: ZoomState = { level: "board" };

  function apply() {
    if (state.level === "board") {
      board.style.transform = "translate(0%, 0%) scale(1)";
      return;
    }
    const col = state.index % 3;
    const row = Math.floor(state.index / 3);
    // Scale so one block (1/3 of the board) fills the viewport, then shift the
    // focused block's top-left corner to the viewport's top-left corner.
    board.style.transform = `translate(${-col * 100}%, ${-row * 100}%) scale(3)`;
  }

  function zoomOut() {
    if (state.level === "board") return;
    state = { level: "board" };
    (document.activeElement as HTMLElement | null)?.blur?.();
    apply();
  }

  board.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;

    if (state.level === "board") {
      // A tap zooms into the block instead of focusing a cell.
      const block = target.closest<HTMLElement>(".block");
      if (block) {
        event.preventDefault();
        state = { level: "block", index: Number(block.dataset.block) };
        apply();
      }
      return;
    }

    // Block view: do nothing. The `.cell-text` fills the cell (absolute,
    // inset:0) and is contenteditable, so we let native pointer behavior handle
    // focus, click-to-place-caret, and click-drag text selection.
  });

  // Tap outside the board to zoom back out.
  document.addEventListener("pointerdown", (event) => {
    if (!viewport.contains(event.target as Node)) {
      zoomOut();
    }
  });

  // Escape zooms back out.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      zoomOut();
    }
  });

  apply();
}
