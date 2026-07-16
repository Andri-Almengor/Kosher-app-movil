import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/app/auth/authStore";
import { create } from "zustand";

// NOTE: Force Zustand CJS middleware to avoid Expo Web import.meta issues.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { persist, createJSONStorage } = require("zustand/middleware") as typeof import("zustand/middleware");

type State = {
  byUser: Record<string, string[]>;
  currentUserKey: string;
};

type Actions = {
  setCurrentUser: (key: string) => void;
  list: () => string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "favorites_v2";

const getUserKey = (): string => {
  const u = useAuth.getState().user;
  const email = u?.email?.trim().toLowerCase();
  return email && email.length > 0 ? email : "anon";
};

export const useFavorites = create<State & Actions>()(
  persist<State & Actions>(
    (set, get) => ({
      byUser: {},
      currentUserKey: getUserKey(),

      setCurrentUser: (key) => set({ currentUserKey: key }),

      list: () => {
        const s = get();
        return s.byUser[s.currentUserKey] ?? [];
      },

      has: (id) => get().list().includes(id),

      add: (id) => {
        const { byUser, currentUserKey } = get();
        const setIds = new Set(byUser[currentUserKey] ?? []);
        setIds.add(id);
        set({ byUser: { ...byUser, [currentUserKey]: Array.from(setIds) } });
      },

      remove: (id) => {
        const { byUser, currentUserKey } = get();
        const setIds = new Set(byUser[currentUserKey] ?? []);
        setIds.delete(id);
        set({ byUser: { ...byUser, [currentUserKey]: Array.from(setIds) } });
      },

      toggle: (id) => {
        const { has, add, remove } = get();
        has(id) ? remove(id) : add(id);
      },

      clear: () => {
        const { byUser, currentUserKey } = get();
        set({ byUser: { ...byUser, [currentUserKey]: [] } });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,

      partialize: (s) =>
        ({ byUser: s.byUser, currentUserKey: s.currentUserKey } as any),

      migrate: async (persisted: any, _version: number) => {
        if (
          persisted &&
          typeof persisted === "object" &&
          "byUser" in persisted &&
          "currentUserKey" in persisted
        ) {
          return {
            byUser: (persisted as any).byUser ?? {},
            currentUserKey: (persisted as any).currentUserKey ?? getUserKey(),
          } as any;
        }

        try {
          const legacy = await AsyncStorage.getItem("favorites");
          if (legacy) {
            const ids = JSON.parse(legacy);
            const key = getUserKey();
            await AsyncStorage.removeItem("favorites");
            return {
              byUser: { [key]: Array.isArray(ids) ? (ids as string[]) : [] },
              currentUserKey: key,
            } as any;
          }
        } catch {
          // silencioso
        }

        return {
          byUser: {},
          currentUserKey: getUserKey(),
        } as any;
      },

      onRehydrateStorage: () => (state) => {
        const key = getUserKey();
        state?.setCurrentUser?.(key);
      },
    }
  )
);

// Mantener sincronizado el userKey cuando cambie el auth
useAuth.subscribe((auth) => {
  const key = auth?.user?.email?.trim().toLowerCase() || "anon";
  const st = useFavorites.getState();
  if (st.currentUserKey !== key) {
    st.setCurrentUser(key);
  }
});
