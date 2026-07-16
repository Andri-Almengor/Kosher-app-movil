import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type News = {
  id: string;
  title: string;
  body: string;
  category?: "Info" | "Promo" | "Alerta" | string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
};

type State = { items: News[] };
type Actions = {
  seedIfEmpty: () => void;
  list: () => News[];
  byId: (id: string) => News | undefined;
  create: (n: Omit<News, "id" | "createdAt" | "updatedAt">) => News;
  update: (id: string, p: Partial<News>) => void;
  remove: (id: string) => void;
  clearAll: () => void;
};

const STORAGE_KEY = "local_news_store";
const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

export const useNewsStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      items: [],
      seedIfEmpty: () => {
        const s = get();
        if (s.items.length) return;
        const seed: News[] = [
          { id: uid(), title: "¡Bienvenidos!", body: "Demo local.", category: "Info", createdAt: now(), updatedAt: now(), author: "Admin" },
          { id: uid(), title: "Promo 2x1", body: "Fin de semana.", category: "Promo", createdAt: now(), updatedAt: now(), author: "Admin" },
        ];
        set({ items: seed });
      },
      list: () => [...get().items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
      byId: (id) => get().items.find((n) => n.id === id),
      create: (n) => {
        const item: News = { id: uid(), createdAt: now(), updatedAt: now(), ...n };
        set({ items: [item, ...get().items] });
        return item;
      },
      update: (id, patch) => {
        set({ items: get().items.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)) });
      },
      remove: (id) => set({ items: get().items.filter((n) => n.id !== id) }),
      clearAll: () => set({ items: [] }),
    }),
    { name: STORAGE_KEY, storage: createJSONStorage(() => AsyncStorage), version: 1 }
  )
);
