import { create } from "zustand";

type ZustandState = {
  selectedFolderId: number | null;
};

type ZustandStore = ZustandState & {
  setSelectedFolderId: (
    value: number | null | ((prev: number | null) => number | null),
  ) => void;
};

export const useZustandStore = create<ZustandStore>((set) => ({
  selectedFolderId: null,

  setSelectedFolderId: (value) =>
    set((state) => ({
      selectedFolderId:
        typeof value === "function" ? value(state.selectedFolderId) : value,
    })),
}));
