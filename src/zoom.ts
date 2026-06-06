import type { BoardElements } from "./grid.ts";

// Discrete, snapped zoom: either the whole 9x9 board, or a single 3x3 block
// scaled to fill the viewport. No free-form zooming — the view always lands
// on a clean, square-aligned region.

type ZoomState =
  | { level: "board" }
  | { level: "block"; index: number };

export function initZoom({ board, blocks }: BoardElements): void {
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

  blocks.forEach((block, index) => {
    block.addEventListener("click", () => {
      if (state.level === "board") {
        state = { level: "block", index };
      } else {
        state = { level: "board" };
      }
      apply();
    });
  });

  apply();
}
