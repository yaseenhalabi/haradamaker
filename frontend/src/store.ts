import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";

// Cells are keyed by `${block}-${cell}` (both 0..8, row-major).
export interface BoardState {
  cells: Record<string, string>;
  // Which cells are marked "done" (completed) — toggled in View mode.
  done: Record<string, boolean>;
  setCell: (key: string, value: string) => void;
  toggleDone: (key: string) => void;
  replaceBoard: (cells: Record<string, string>, done: Record<string, boolean>) => void;
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
      replaceBoard: (cells, done) => set({ cells, done }),
    }),
    { name: "haradamaker-board" },
  ),
);

export const cellKey = (block: number, cell: number) => `${block}-${cell}`;

export type BoardSnapshot = Pick<BoardState, "cells" | "done">;

export function boardSnapshot(): BoardSnapshot {
  const { cells, done } = boardStore.getState();
  return { cells, done };
}
