import "./style.css";
import { buildBoard } from "./grid.ts";
import { initZoom } from "./zoom.ts";
import { initEditing } from "./edit.ts";

const mount = document.getElementById("app");
if (!mount) {
  throw new Error("#app mount point not found");
}

const elements = buildBoard(mount);
initEditing(elements);
initZoom(elements);
