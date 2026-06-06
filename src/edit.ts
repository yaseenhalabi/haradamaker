import type { BoardElements } from "./grid.ts";
import { boardStore, cellKey } from "./store.ts";

const MIN_FONT = 6; // px
const MAX_FONT = 28; // px — keep short text at a sensible medium size

// A single offscreen element used to measure text at a given font size and
// width. Measuring on this probe (instead of the live, visible cell) means the
// visible text never reflows mid-search, so there is no flashing — we compute
// the final size first and apply it once.
const probe = document.createElement("div");
probe.setAttribute("aria-hidden", "true");
probe.style.cssText = [
  "position:absolute",
  "visibility:hidden",
  "pointer-events:none",
  "left:-99999px",
  "top:0",
  "box-sizing:border-box",
  "white-space:pre-wrap",
  "word-break:break-word",
  "overflow-wrap:anywhere",
  "line-height:1.1",
  "font-weight:500",
  "text-align:center",
].join(";");
document.body.appendChild(probe);

// Size the font so the text fits inside its cell's content box. The probe is
// pinned to the cell's content width and we binary-search the largest font
// size whose wrapped text fits within the content height (and width).
function fitText(el: HTMLElement): void {
  const text = el.textContent ?? "";
  if (text.trim() === "") {
    el.style.fontSize = "";
    return;
  }

  const cs = getComputedStyle(el);
  const padX =
    parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const contentW = el.clientWidth - padX;
  const contentH = el.clientHeight - padY;
  if (contentW <= 0 || contentH <= 0) return;

  probe.style.fontFamily = cs.fontFamily;
  probe.style.width = `${contentW}px`;
  probe.textContent = text;

  // A single line is roughly line-height * fontSize tall, so the content height
  // is a natural upper bound — but cap it so short text doesn't render huge.
  let lo = MIN_FONT;
  let hi = Math.min(Math.ceil(contentH) + 1, MAX_FONT);
  let best = MIN_FONT;

  for (let i = 0; i < 20 && hi - lo > 0.3; i++) {
    const mid = (lo + hi) / 2;
    probe.style.fontSize = `${mid}px`;
    const fits =
      probe.scrollHeight <= contentH && probe.scrollWidth <= contentW + 0.5;
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
