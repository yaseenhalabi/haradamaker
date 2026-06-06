import type { BoardElements } from "./grid.ts";

// Discrete, snapped zoom: either the whole 9x9 board, or a single 3x3 block
// scaled to fill the viewport. No free-form zooming — the view always lands
// on a clean, square-aligned region.
//
// Interaction model:
//   - board view: tapping a block zooms into it. Cells are NOT editable here —
//     a tap can only navigate, never focus a cell / pop the keyboard.
//   - block view: tapping a cell focuses it for typing; Escape or tapping
//     outside the board snaps back out to the whole board.
//   - touch: a two-finger pinch drives the same snapped zoom — spreading apart
//     zooms into the block under the pinch, pinching together zooms back out.
//     (Native browser pinch-zoom stays disabled via the viewport meta tag and
//     `touch-action: none`.)
//
// Focus gating: editing is only enabled AFTER a zoom-in settles, never during
// the tap that triggered it. Otherwise, on touch, the synthetic click that
// follows the zoom tap would land on the now-editable cell and focus it (which
// preventDefault() on pointerdown cannot stop on iOS). A `focusin` guard blurs
// any focus attempt while editing is disabled, as a hard backstop.

type ZoomState = { level: "board" } | { level: "block"; index: number };

// How far the finger spread has to change, as a ratio of the starting spread,
// before a pinch counts as an intentional zoom in/out.
const PINCH_IN_RATIO = 0.8;
const PINCH_OUT_RATIO = 1.25;

export function initZoom({ viewport, board }: BoardElements): void {
  let state: ZoomState = { level: "board" };
  let editable = false;
  let editTimer = 0;

  // `zoomed` on the viewport both drives the CSS (cells become interactive) and
  // tracks whether editing is currently allowed.
  function setEditable(on: boolean) {
    editable = on;
    viewport.classList.toggle("zoomed", on);
  }

  function apply() {
    // The board is laid out at 3x the viewport (see CSS). The overview shrinks
    // it to fit; block view shows one block at native scale(1) — so text and
    // lines render crisply at real px instead of being magnified.
    if (state.level === "board") {
      board.style.transform = "translate(0%, 0%) scale(0.3333333333)";
      return;
    }
    const col = state.index % 3;
    const row = Math.floor(state.index / 3);
    // Shift the focused block to the viewport's top-left corner. translate % is
    // relative to the board's own 3x size, so -33.333% moves exactly one block.
    board.style.transform = `translate(${-col * 33.3333333333}%, ${
      -row * 33.3333333333
    }%) scale(1)`;
  }

  function zoomIn(index: number) {
    if (state.level === "block") return;
    state = { level: "block", index };
    apply();
    // Enable editing only once the zoom has settled, so the tap (and its
    // trailing synthetic click) that triggered the zoom can't also focus a
    // cell. `transitionend` is primary; the timer is a fallback for when the
    // transition is skipped (e.g. prefers-reduced-motion).
    clearTimeout(editTimer);
    editTimer = window.setTimeout(() => {
      if (state.level === "block") setEditable(true);
    }, 320);
  }

  function zoomOut() {
    if (state.level === "board") return;
    state = { level: "board" };
    clearTimeout(editTimer);
    setEditable(false);
    (document.activeElement as HTMLElement | null)?.blur?.();
    apply();
  }

  board.addEventListener("transitionend", (event) => {
    if (event.propertyName === "transform" && state.level === "block") {
      setEditable(true);
    }
  });

  // Hard backstop: if anything tries to focus a cell while editing is disabled
  // (e.g. the synthetic click after a zoom-in tap), immediately blur it.
  viewport.addEventListener(
    "focusin",
    (event) => {
      if (!editable) (event.target as HTMLElement | null)?.blur?.();
    },
    true,
  );

  board.addEventListener("pointerdown", (event) => {
    // Ignore taps that are part of a multi-touch pinch — that gesture is
    // handled separately below.
    if (pointers.size >= 2) return;

    if (state.level === "board") {
      // A tap zooms into the block instead of focusing a cell.
      const block = (event.target as HTMLElement).closest<HTMLElement>(
        ".block",
      );
      if (block) {
        event.preventDefault();
        zoomIn(Number(block.dataset.block));
      }
      return;
    }

    // Block view: do nothing. The `.cell-text` fills the cell (absolute,
    // inset:0) and is contenteditable, so we let native pointer behavior handle
    // focus, click-to-place-caret, and click-drag text selection.
  });

  // --- Two-finger pinch: drive the snapped zoom from touch gestures. ---
  const pointers = new Map<number, { x: number; y: number }>();
  let startDist = 0;
  let pinchHandled = false;

  function activePoints() {
    return Array.from(pointers.values());
  }

  function spread() {
    const [a, b] = activePoints();
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function midpoint() {
    const [a, b] = activePoints();
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  viewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      startDist = spread();
      pinchHandled = false;
    }
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size !== 2 || pinchHandled || startDist === 0) return;

    const ratio = spread() / startDist;
    if (ratio >= PINCH_OUT_RATIO) {
      pinchHandled = true;
      // Zoom into whichever block sits under the center of the pinch. Derive the
      // block from the viewport-relative position (robust even if the midpoint
      // lands on a grid gap) rather than hit-testing the DOM.
      const mid = midpoint();
      const rect = viewport.getBoundingClientRect();
      const col = Math.min(2, Math.max(0, Math.floor(((mid.x - rect.left) / rect.width) * 3)));
      const row = Math.min(2, Math.max(0, Math.floor(((mid.y - rect.top) / rect.height) * 3)));
      zoomIn(row * 3 + col);
    } else if (ratio <= PINCH_IN_RATIO) {
      pinchHandled = true;
      zoomOut();
    }
  });

  function dropPointer(event: PointerEvent) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) startDist = 0;
  }
  viewport.addEventListener("pointerup", dropPointer);
  viewport.addEventListener("pointercancel", dropPointer);

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
