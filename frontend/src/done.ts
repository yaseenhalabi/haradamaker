import type { BoardElements } from "./grid.ts";
import { boardStore, cellKey } from "./store.ts";

// "Done" marking: while in View mode and zoomed into a block, tapping a cell
// toggles a completed state — a transparent black overlay with a check mark.
// State is persisted via the board store, so it survives reloads and mode
// switches.
//
// Marking cascades through the board's hierarchy:
//   - Action cells (the 8 outer cells of any block) are toggled by the user.
//   - A block's *center* cell (cell 4) can't be tapped directly. It auto-marks
//     once all 8 of that block's action cells are done.
//   - When an OUTER block (b ≠ 4) auto-completes, its mirror in the center
//     block — cell (4, b) — auto-marks too.
//   - The final goal (block 4, cell 4) is never auto-marked: the user must mark
//     it, and only once all 8 outer blocks are complete (so the whole center
//     block's ring is filled).

const CENTER_BLOCK = 4;
const CENTER_CELL = 4;

const isActionCell = (b: number, c: number) =>
  b !== CENTER_BLOCK && c !== CENTER_CELL;
const isGoal = (b: number, c: number) =>
  b === CENTER_BLOCK && c === CENTER_CELL;

// An outer block is "complete" once all 8 of its action cells are user-done.
function blockComplete(done: Record<string, boolean>, b: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (c === CENTER_CELL) continue;
    if (!done[cellKey(b, c)]) return false;
  }
  return true;
}

// All 8 outer blocks complete — the precondition for marking the goal.
function allOuterBlocksComplete(done: Record<string, boolean>): boolean {
  for (let b = 0; b < 9; b++) {
    if (b === CENTER_BLOCK) continue;
    if (!blockComplete(done, b)) return false;
  }
  return true;
}

// The visible state of a cell, after applying the cascade rules.
function effectiveDone(
  done: Record<string, boolean>,
  b: number,
  c: number,
): boolean {
  // Action cells (outer cells of any block): driven directly by the user.
  if (isActionCell(b, c)) return !!done[cellKey(b, c)];
  // The goal: user-marked, but only counts once the whole ring is complete.
  if (isGoal(b, c)) {
    return allOuterBlocksComplete(done) && !!done[cellKey(b, c)];
  }
  // Outer block center (b ≠ 4, cell 4): auto when that block is complete.
  if (b !== CENTER_BLOCK) return blockComplete(done, b);
  // Center block ring (block 4, cell c ≠ 4): mirrors outer block c's center,
  // so it lights up once outer block c is complete.
  return blockComplete(done, c);
}

export function renderDoneState(
  viewport: HTMLElement,
  done: Record<string, boolean>,
): void {
  const cells = Array.from(viewport.querySelectorAll<HTMLDivElement>(".cell"));
  for (const cell of cells) {
    const b = Number(cell.dataset.block);
    const c = Number(cell.dataset.cell);
    cell.classList.toggle("is-done", effectiveDone(done, b, c));
  }
}

export function initDone({ viewport, board }: BoardElements): void {
  // Reflect the (derived) done state onto the cells' classes.
  function render() {
    const { done } = boardStore.getState();
    renderDoneState(viewport, done);
  }

  boardStore.subscribe(render);
  render();

  // Toggle on tap, but only in View mode and only when zoomed into a block
  // (so it can't fire from the overview tap that performs the zoom-in). `click`
  // naturally ignores pinch/drag gestures.
  board.addEventListener("click", (event) => {
    if (!viewport.classList.contains("mode-view")) return;
    if (!viewport.classList.contains("zoomed")) return;
    const cell = (event.target as HTMLElement).closest<HTMLElement>(".cell");
    if (!cell) return;
    const b = Number(cell.dataset.block);
    const c = Number(cell.dataset.cell);

    // Action cells are freely user-toggleable.
    if (isActionCell(b, c)) {
      boardStore.getState().toggleDone(cellKey(b, c));
      return;
    }
    // The goal can only be marked once every outer block is complete.
    if (isGoal(b, c)) {
      const { done } = boardStore.getState();
      const marked = !!done[cellKey(b, c)];
      if (marked || allOuterBlocksComplete(done)) {
        boardStore.getState().toggleDone(cellKey(b, c));
      }
      return;
    }
    // All other cells (block centers / center-block ring) are auto-derived and
    // cannot be tapped directly.
  });
}
