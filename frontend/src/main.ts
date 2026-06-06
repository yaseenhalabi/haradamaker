import "./style.css";
import { buildBoard } from "./grid.ts";
import { initZoom } from "./zoom.ts";
import { initEditing } from "./edit.ts";
import { initDone } from "./done.ts";
import { createModeSwitch } from "./mode.ts";
import { createSidebar } from "./sidebar.ts";
import { createExportMenu } from "./export.ts";
import { createPersistenceControls } from "./persistence.ts";
import { initSharedBoard } from "./share.ts";
import { createColorSchemePicker } from "./colorScheme.ts";

const mount = document.getElementById("app");
if (!mount) {
  throw new Error("#app mount point not found");
}

const shareMatch = window.location.pathname.match(/^\/share\/([^/]+)$/);
if (shareMatch) {
  initSharedBoard(mount, decodeURIComponent(shareMatch[1]));
} else {
// Left sidebar (Edit mode only; an overlay on mobile).
createSidebar(mount);

// The board lives in its own column to the right of the sidebar so it can be
// centered within the remaining space (and full-screen-centered in View mode).
const boardArea = document.createElement("div");
boardArea.className = "board-area";
mount.appendChild(boardArea);

const toolbar = document.createElement("div");
toolbar.className = "toolbar";
boardArea.appendChild(toolbar);

const elements = buildBoard(boardArea);
initEditing(elements);
initDone(elements);
initZoom(elements);

const modeSwitch = createModeSwitch(elements.viewport);
toolbar.appendChild(modeSwitch);
createColorSchemePicker(toolbar);
createPersistenceControls(toolbar, elements);
createExportMenu(toolbar);

// Mobile-only hint below the board while zoomed in. Tapping it lands outside the
// viewport, which the document pointerdown handler treats as a zoom-out.
const zoomHint = document.createElement("div");
zoomHint.className = "zoom-hint";
zoomHint.textContent = "Tap here to zoom out";
boardArea.appendChild(zoomHint);
}
