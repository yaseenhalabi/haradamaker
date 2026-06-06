import type { BoardElements } from "./grid.ts";
import { boardStore, cellKey } from "./store.ts";

// Lower bound for the auto-fit. Smaller on mobile so long single words like
// "extraordinary" can still shrink enough to fit inside the smaller cells.
function minFont(): number {
  return window.matchMedia("(max-width: 600px)").matches ? 3 : 6;
}
// Upper bound when a short entry grows to fill its cell. Smaller on mobile so
// text stays readable and fits within the smaller cells.
function maxFont(): number {
  return window.matchMedia("(max-width: 600px)").matches ? 24 : 40;
}

// Pillar mirroring: the 8 cells around the goal in the center block are the same
// values as the center cell of each outer block. Block index and cell index are
// both row-major 0..8, so (center block 4, cell B) mirrors (block B, cell 4).
// Returns the mirrored { block, cell } for a pillar cell, or null otherwise.
function mirrorOf(
  block: number,
  cell: number,
): { block: number; cell: number } | null {
  if (block === 4 && cell !== 4) return { block: cell, cell: 4 };
  if (cell === 4 && block !== 4) return { block: 4, cell: block };
  return null;
}

// Hidden probe used to measure wrapped text at a candidate font size without
// touching (and reflowing) the visible cell. Measuring here means we can search
// for the best size and apply it once. Its layout-affecting styles must match
// `.cell-text` in style.css so the measurement is faithful.
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
  "word-break:normal",
  "overflow-wrap:normal",
  "line-height:1.2",
  "text-align:center",
].join(";");
document.body.appendChild(probe);

// Find and apply the largest font size (capped) at which the text fits inside
// the cell's content box, by binary-searching on the probe. Called only when a
// cell is *not* being edited (load, blur, resize) — never per keystroke — so
// typing stays stable and the box only snaps to a clean fit afterwards.
function fitText(el: HTMLElement): void {
  const text = el.textContent ?? "";
  if (text.trim() === "") {
    el.style.fontSize = ""; // revert to the CSS baseline / empty-caret centering
    return;
  }

  const cs = getComputedStyle(el);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const contentW = el.clientWidth - padX;
  const contentH = el.clientHeight - padY;
  if (contentW <= 0 || contentH <= 0) return;

  probe.style.fontFamily = cs.fontFamily;
  probe.style.fontWeight = cs.fontWeight; // pillars/goal are bold — match it
  probe.style.width = `${contentW}px`;
  probe.textContent = text;

  const loFont = minFont();
  let lo = loFont;
  let hi = Math.min(Math.ceil(contentH) + 1, maxFont());
  let best = loFont;

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

  // Lookup so a pillar edit can find and update its mirror element.
  const elByKey = new Map<string, HTMLDivElement>();
  for (const el of texts) {
    elByKey.set(
      cellKey(Number(el.dataset.block), Number(el.dataset.cell)),
      el,
    );
  }

  // Populate from the persisted store.
  const { cells } = boardStore.getState();
  for (const el of texts) {
    const key = cellKey(Number(el.dataset.block), Number(el.dataset.cell));
    const value = cells[key];
    if (value) {
      el.textContent = value;
    }
  }

  // Reconcile mirrored pillar pairs so the invariant holds on load. The center
  // block (block 4) is canonical; fall back to the outer value if it's empty.
  for (let b = 0; b < 9; b++) {
    if (b === 4) continue;
    const centerKey = cellKey(4, b); // pillar around the goal
    const outerKey = cellKey(b, 4); // mirrored center of the outer block
    const centerEl = elByKey.get(centerKey)!;
    const outerEl = elByKey.get(outerKey)!;
    const canonical =
      (centerEl.textContent ?? "") || (outerEl.textContent ?? "");
    if ((centerEl.textContent ?? "") !== canonical) {
      centerEl.textContent = canonical;
      boardStore.getState().setCell(centerKey, canonical);
    }
    if ((outerEl.textContent ?? "") !== canonical) {
      outerEl.textContent = canonical;
      boardStore.getState().setCell(outerKey, canonical);
    }
  }

  // Fit all unfocused cells once now, and again after the web font loads
  // (metrics change). Nothing is focused at startup, so fit everything.
  const fitAll = () => texts.forEach(fitText);
  fitAll();
  document.fonts?.ready.then(fitAll);

  for (const el of texts) {
    const block = Number(el.dataset.block);
    const cell = Number(el.dataset.cell);
    const mirror = mirrorOf(block, cell);

    // While editing, drop the fitted size back to the stable CSS baseline so the
    // text doesn't rescale as you type — it behaves like a normal text box.
    el.addEventListener("focus", () => {
      el.style.fontSize = "";
    });

    // Enter (including Shift+Enter) ends editing instead of inserting a newline.
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        el.blur();
      }
    });

    // Persist on every edit, and keep a pillar's mirror in sync (value + size).
    el.addEventListener("input", () => {
      // After deleting all text, contenteditable leaves a stray <br>, so the
      // element is no longer `:empty` — the centered-caret workaround stops and
      // some browsers can't re-edit the cell. Force it truly empty. (Setting
      // innerHTML doesn't fire another input event, so there's no loop.)
      if ((el.textContent ?? "") === "" && el.innerHTML !== "") {
        el.innerHTML = "";
      }

      const value = el.textContent ?? "";
      boardStore.getState().setCell(cellKey(block, cell), value);

      if (mirror) {
        const mirrorEl = elByKey.get(cellKey(mirror.block, mirror.cell));
        if (mirrorEl && mirrorEl !== document.activeElement) {
          mirrorEl.textContent = value;
          boardStore.getState().setCell(cellKey(mirror.block, mirror.cell), value);
          fitText(mirrorEl);
        }
      }
    });

    // On blur, snap the font to fit the cell — growing or shrinking as needed.
    el.addEventListener("blur", () => {
      fitText(el);
    });
  }

  // Cell sizes change with the window, so refit — but leave the focused cell at
  // its stable editing size.
  let resizeTimer: number | undefined;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      for (const el of texts) {
        if (document.activeElement !== el) fitText(el);
      }
    }, 100);
  });
}
