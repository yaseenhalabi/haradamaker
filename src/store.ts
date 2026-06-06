import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";

// Cells are keyed by `${block}-${cell}` (both 0..8, row-major).
export interface BoardState {
  cells: Record<string, string>;
  // Which cells are marked "done" (completed) — toggled in View mode.
  done: Record<string, boolean>;
  setCell: (key: string, value: string) => void;
  toggleDone: (key: string) => void;
}

export const boardStore = createStore<BoardState>()(
  persist(
    (set) => ({
      cells: {},
      done: {},
      setCell: (key, value) =>
        set((state) => ({ cells: { ...state.cells, [key]: value } })),
      toggleDone: (key) =>
        set((state) => ({ done: { ...state.done, [key]: !state.done[key] } })),
    }),
    { name: "haradamaker-board" },
  ),
);

export const cellKey = (block: number, cell: number) => `${block}-${cell}`;
