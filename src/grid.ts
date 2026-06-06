// Builds the 9x9 Harada board as a 3x3 arrangement of 3x3 blocks.
// Block index 0..8 follows row-major order (0 = top-left, 4 = center, 8 = bottom-right).
// Cell index within a block is also 0..8 row-major.

export interface BoardElements {
  viewport: HTMLDivElement;
  board: HTMLDivElement;
  blocks: HTMLDivElement[];
}

export function buildBoard(mount: HTMLElement): BoardElements {
  const viewport = document.createElement("div");
  viewport.className = "board-viewport";

  const board = document.createElement("div");
  board.className = "board";

  const blocks: HTMLDivElement[] = [];

  for (let b = 0; b < 9; b++) {
    const block = document.createElement("div");
    block.className = "block";
    block.dataset.block = String(b);

    for (let c = 0; c < 9; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.block = String(b);
      cell.dataset.cell = String(c);

      // Visual hierarchy of a Harada board:
      //   - goal:   the very center cell of the center block (block 4, cell 4).
      //   - pillar: the 8 cells around the goal AND each outer block's center,
      //             which are mirrors of each other (block 4, cell B) ↔ (B, 4).
      //   - action: every other cell.
      const isCenterBlock = b === 4;
      const isCenterCell = c === 4;
      if (isCenterBlock && isCenterCell) {
        cell.classList.add("goal");
      } else if (isCenterBlock !== isCenterCell) {
        cell.classList.add("pillar");
      }

      const text = document.createElement("div");
      text.className = "cell-text";
      text.dataset.block = String(b);
      text.dataset.cell = String(c);
      // plaintext-only keeps the contenteditable from inserting markup.
      text.setAttribute("contenteditable", "plaintext-only");
      text.spellcheck = false;
      cell.appendChild(text);

      block.appendChild(cell);
    }

    blocks.push(block);
    board.appendChild(block);
  }

  viewport.appendChild(board);
  mount.appendChild(viewport);

  return { viewport, board, blocks };
}
