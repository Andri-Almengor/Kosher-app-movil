import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";

type State = {
  mode: ThemeMode;
};

type Actions = {
  setMode: (m: ThemeMode) => void;
  toggleLightDark: () => void;
};

export const useThemeStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      mode: "system",
      setMode: (m) => set({ mode: m }),
      toggleLightDark: () => {
        const cur = get().mode;
        if (cur === "dark") set({ mode: "light" });
        else set({ mode: "dark" });
      },
    }),
    {
      name: "theme",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
