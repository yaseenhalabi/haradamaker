import "./style.css";
import { buildBoard } from "./grid.ts";
import { initZoom } from "./zoom.ts";
import { initEditing } from "./edit.ts";
import { initDone } from "./done.ts";
import { createModeSwitch } from "./mode.ts";
import { createSidebar } from "./sidebar.ts";
import { createExportMenu } from "./export.ts";

const mount = document.getElementById("app");
if (!mount) {
  throw new Error("#app mount point not found");
}

// Left sidebar (Edit mode only; an overlay on mobile).
createSidebar(mount);

// Export menu, pinned to the top-right.
createExportMenu(mount);

// The board lives in its own column to the right of the sidebar so it can be
// centred within the remaining space (and full-screen-centred in View mode).
const boardArea = document.createElement("div");
boardArea.className = "board-area";
mount.appendChild(boardArea);

const elements = buildBoard(boardArea);
initEditing(elements);
initDone(elements);
initZoom(elements);

// Edit/View toggle, placed above the board.
const modeSwitch = createModeSwitch(elements.viewport);
boardArea.insertBefore(modeSwitch, elements.viewport);

// Mobile-only hint below the board while zoomed in. Tapping it lands outside the
// viewport, which the document pointerdown handler treats as a zoom-out.
const zoomHint = document.createElement("div");
zoomHint.className = "zoom-hint";
zoomHint.textContent = "Tap here to zoom out";
boardArea.appendChild(zoomHint);
