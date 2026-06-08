import {
  createElement,
  ClipboardCopy,
  Download,
  FileImage,
  FileJson,
  Printer,
} from "lucide";
import { getCurrentColorScheme } from "./colorScheme.ts";
import { boardStore, cellKey } from "./store.ts";

// Export the board independently of the live DOM (which is laid out at 3x and
// transformed for zoom — awkward to rasterise). We redraw the 9x9 chart onto a
// fresh canvas straight from the store, so the output is always crisp and shows
// the whole board regardless of the current zoom/mode.

// Geometry (px). Black background shows through the gaps as grid lines.
const CELL = 190;
const THIN = 4; // gap between cells within a block
const THICK = 12; // gaps between blocks (and the board's own inner border)
const PAD = 48; // white margin around the whole board
const BLOCK = 3 * CELL + 2 * THIN;
const BOARD = 4 * THICK + 3 * BLOCK; // the black grid square
const SIZE = BOARD + 2 * PAD; // full image incl. margin

function cellRect(b: number, c: number) {
  const bx = b % 3;
  const by = Math.floor(b / 3);
  const cx = c % 3;
  const cy = Math.floor(c / 3);
  const x = PAD + THICK + bx * (BLOCK + THICK) + cx * (CELL + THIN);
  const y = PAD + THICK + by * (BLOCK + THICK) + cy * (CELL + THIN);
  return { x, y };
}

// Greedy word-wrap that shrinks the font until every word fits the width and the
// stacked lines fit the height. Mirrors the on-screen "fit, never break a word".
function drawCellText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bold: boolean,
  color: string,
) {
  const value = text.trim();
  if (!value) return;

  const pad = CELL * 0.1;
  const maxW = CELL - 2 * pad;
  const maxH = CELL - 2 * pad;
  const words = value.split(/\s+/);
  const weight = bold ? "700" : "500";

  for (let font = Math.round(CELL * 0.3); font >= 10; font -= 2) {
    ctx.font = `${weight} ${font}px Inter, system-ui, sans-serif`;
    const lineH = font * 1.2;

    // Wrap into lines; bail if any single word is too wide for this size.
    const lines: string[] = [];
    let line = "";
    let tooWide = false;
    for (const word of words) {
      if (ctx.measureText(word).width > maxW) {
        tooWide = true;
        break;
      }
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxW) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (tooWide) continue;
    if (line) lines.push(line);

    if (lines.length * lineH > maxH) continue;

    // Fits — paint it centered.
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const totalH = lines.length * lineH;
    const startY = y + CELL / 2 - totalH / 2 + lineH / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x + CELL / 2, startY + i * lineH);
    }
    return;
  }
}

export function boardToCanvas(scale = 2): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE * scale;
  canvas.height = SIZE * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  const colors = getCurrentColorScheme();

  // White margin, then the black board square whose gaps form the grid lines.
  ctx.fillStyle = colors.cell;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = colors.line;
  ctx.fillRect(PAD, PAD, BOARD, BOARD);

  const { cells } = boardStore.getState();

  for (let b = 0; b < 9; b++) {
    for (let c = 0; c < 9; c++) {
      const isCenterBlock = b === 4;
      const isCenterCell = c === 4;
      const goal = isCenterBlock && isCenterCell;
      const pillar = isCenterBlock !== isCenterCell;

      const { x, y } = cellRect(b, c);
      ctx.fillStyle = goal
        ? colors.goal
        : pillar
          ? colors.pillar
          : colors.cell;
      ctx.fillRect(x, y, CELL, CELL);

      const value = cells[cellKey(b, c)] ?? "";
      drawCellText(
        ctx,
        value,
        x,
        y,
        pillar || goal,
        goal ? colors.goalText : colors.text,
      );
    }
  }

  return canvas;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportPNG(): void {
  const canvas = boardToCanvas();
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `harada-${stamp()}.png`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

export async function copyPNG(): Promise<void> {
  const canvas = boardToCanvas();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) return;
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob }),
  ]);
}

export function exportJSON(): void {
  const { cells, done } = boardStore.getState();
  const data = JSON.stringify({ version: 1, cells, done }, null, 2);
  const url = URL.createObjectURL(
    new Blob([data], { type: "application/json" }),
  );
  triggerDownload(url, `harada-${stamp()}.json`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Top-right button that opens a small menu of the export actions above.
export function createExportMenu(mount: HTMLElement): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "export";

  const toggle = document.createElement("button");
  toggle.className = "export__toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Export");
  toggle.appendChild(createElement(Download));
  toggle.appendChild(document.createTextNode("Export"));

  const menu = document.createElement("div");
  menu.className = "export__menu";

  const items: Array<[ReturnType<typeof createElement>, string, () => void]> = [
    [createElement(FileImage), "Download image (PNG)", exportPNG],
    [createElement(ClipboardCopy), "Copy image to clipboard", copyPNG],
    [createElement(FileJson), "Download data (JSON)", exportJSON],
    [createElement(Printer), "Print", exportPrint],
  ];

  for (const [icon, label, action] of items) {
    const btn = document.createElement("button");
    btn.className = "export__item";
    btn.type = "button";
    btn.appendChild(icon);
    btn.appendChild(document.createTextNode(label));
    btn.addEventListener("click", () => {
      close();
      action();
    });
    menu.appendChild(btn);
  }

  const close = () => wrap.classList.remove("is-open");

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    wrap.classList.toggle("is-open");
  });
  document.addEventListener("click", (event) => {
    if (!wrap.contains(event.target as Node)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  wrap.appendChild(toggle);
  wrap.appendChild(menu);
  mount.appendChild(wrap);
  return wrap;
}

export function exportPrint(): void {
  const dataUrl = boardToCanvas().toDataURL("image/png");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`
    <!doctype html><html><head><title>Harada chart</title>
    <style>
      html,body{margin:0;height:100%}
      body{display:flex;align-items:center;justify-content:center;padding:16px}
      img{max-width:100%;max-height:100%;object-fit:contain}
      @media print{body{padding:0}}
    </style></head>
    <body><img src="${dataUrl}" onload="window.focus();window.print()"></body>
    </html>
  `);
  w.document.close();
}
