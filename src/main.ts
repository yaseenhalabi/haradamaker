import "./style.css";
import { buildBoard } from "./grid.ts";
import { initZoom } from "./zoom.ts";

const mount = document.getElementById("app");
if (!mount) {
  throw new Error("#app mount point not found");
}

const elements = buildBoard(mount);
initZoom(elements);
