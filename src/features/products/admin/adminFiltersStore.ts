import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProvinceCR } from "../api/types"; // ← ruta correcta

export type AdminSort = "recents" | "nameAZ" | "priceAsc" | "priceDesc";

type Filters = {
  q: string;
  province: ProvinceCR | "Todas";
  brand: string | "Todas";
  minPrice: string;
  maxPrice: string;
  sort: AdminSort;
};

type UI = { expanded: boolean };

type State = Filters & UI;

type Actions = {
  set: (patch: Partial<Filters>) => void;
  reset: () => void;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  isActive: () => boolean;
};

const initial: State = {
  q: "",
  province: "Todas",
  brand: "Todas",
  minPrice: "",
  maxPrice: "",
  sort: "recents",
  expanded: false,
};

export const useAdminFilters = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      set: (patch) => set(patch),
      reset: () => set({ ...initial, expanded: get().expanded }),
      toggle: () => set({ expanded: !get().expanded }),
      expand: () => set({ expanded: true }),
      collapse: () => set({ expanded: false }),
      isActive: () => {
        const { q, province, brand, minPrice, maxPrice, sort } = get();
        return !!(
          q ||
          minPrice ||
          maxPrice ||
          province !== "Todas" ||
          brand !== "Todas" ||
          sort !== "recents"
        );
      },
    }),
    { name: "admin-filters", storage: createJSONStorage(() => AsyncStorage) }
  )
);
