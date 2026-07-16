// src/features/products/state/filterStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProductFilters } from "../data/ProductFilters";

// Usamos la misma forma de filtros que en ProductFilters.ts
type Filters = ProductFilters; // { categoria?, marca?, tienda?, gf?, search? }

type UI = {
  expanded: boolean;
};

type Actions = {
  setFilter: <K extends keyof Filters>(
    key: K,
    value: Filters[K] | undefined
  ) => void;
  resetFilters: () => void;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  isActive: () => boolean;
};

type State = Filters & UI & Actions;

const initialFilters: Filters = {
  categoria: undefined,
  marca: undefined,
  tienda: undefined,
  gf: undefined,
  search: undefined,
};

const initialUI: UI = {
  expanded: false,
};

export const useProductFilters = create<State>()(
  persist(
    (set, get) => ({
      ...initialFilters,
      ...initialUI,

      setFilter: (key, value) => {
        set({ [key]: value } as Partial<Filters>);
      },

      resetFilters: () => {
        const { expanded } = get();
        set({ ...initialFilters, expanded });
      },

      toggle: () => set({ expanded: !get().expanded }),
      expand: () => set({ expanded: true }),
      collapse: () => set({ expanded: false }),

      isActive: () => {
        const { categoria, marca, tienda, gf, search } = get();
        return !!(
          categoria ||
          marca ||
          tienda ||
          gf ||
          (search && search.trim())
        );
      },
    }),
    {
      name: "product-filters",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        categoria: state.categoria,
        marca: state.marca,
        tienda: state.tienda,
        gf: state.gf,
        search: state.search,
        expanded: state.expanded,
      }),
    }
  )
);
