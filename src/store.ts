import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";

// Cells are keyed by `${block}-${cell}` (both 0..8, row-major).
export interface BoardState {
  cells: Record<string, string>;
  setCell: (key: string, value: string) => void;
}

export const boardStore = createStore<BoardState>()(
  persist(
    (set) => ({
      cells: {},
      setCell: (key, value) =>
        set((state) => ({ cells: { ...state.cells, [key]: value } })),
    }),
    { name: "haradamaker-board" },
  ),
);

export const cellKey = (block: number, cell: number) => `${block}-${cell}`;
