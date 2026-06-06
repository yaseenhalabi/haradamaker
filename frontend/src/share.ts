import { api } from "./api.ts";
import { renderDoneState } from "./done.ts";
import { buildBoard } from "./grid.ts";
import { renderBoardCells } from "./edit.ts";
import { initZoom } from "./zoom.ts";

export async function initSharedBoard(mount: HTMLElement, token: string): Promise<void> {
  document.body.classList.add("mode-view", "share-view");

  const boardArea = document.createElement("div");
  boardArea.className = "board-area board-area--shared";
  mount.appendChild(boardArea);

  const title = document.createElement("div");
  title.className = "share-title";
  title.textContent = "Loading shared board...";
  boardArea.appendChild(title);

  const elements = buildBoard(boardArea);
  elements.viewport.classList.add("mode-view");
  initZoom(elements);

  try {
    const board = await api.getSharedBoard(token);
    title.textContent = board.title;
    renderBoardCells(elements.viewport, board.cells);
    renderDoneState(elements.viewport, board.done);
    for (const text of elements.viewport.querySelectorAll<HTMLElement>(".cell-text")) {
      text.setAttribute("contenteditable", "false");
    }
  } catch (error) {
    console.error(error);
    title.textContent = "Shared board not found";
  }
}
