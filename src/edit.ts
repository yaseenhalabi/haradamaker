import type { BoardElements } from "./grid.ts";
import { boardStore, cellKey } from "./store.ts";

const MIN_FONT = 6; // px
const MAX_FONT = 200; // px

// Shrink/grow the font so the text fits inside its square cell. The cell clips
// overflow and the text element is capped at 100% of the cell, so when content
// is too big, scrollHeight/scrollWidth exceed clientHeight/clientWidth.
function fitText(el: HTMLElement): void {
  if (!el.textContent || el.textContent.trim() === "") {
    el.style.fontSize = "";
    return;
  }

  let lo = MIN_FONT;
  let hi = MAX_FONT;
  let best = MIN_FONT;

  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    el.style.fontSize = `${mid}px`;
    const fits =
      el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight;
    if (fits) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  el.style.fontSize = `${best}px`;
}

export function initEditing({ viewport }: BoardElements): void {
  const texts = Array.from(
    viewport.querySelectorAll<HTMLDivElement>(".cell-text"),
  );

  // Populate from the persisted store.
  const { cells } = boardStore.getState();
  for (const el of texts) {
    const key = cellKey(Number(el.dataset.block), Number(el.dataset.cell));
    const value = cells[key];
    if (value) {
      el.textContent = value;
    }
  }

  // Fit once now and again after the web font loads (metrics change).
  const fitAll = () => texts.forEach(fitText);
  fitAll();
  document.fonts?.ready.then(fitAll);

  // Save + refit on every edit.
  for (const el of texts) {
    el.addEventListener("input", () => {
      const key = cellKey(Number(el.dataset.block), Number(el.dataset.cell));
      boardStore.getState().setCell(key, el.textContent ?? "");
      fitText(el);
    });
  }

  // Cell sizes change with the window, so refit.
  let resizeTimer: number | undefined;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(fitAll, 100);
  });
}
