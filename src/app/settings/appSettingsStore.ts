import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setApiBaseUrl } from "@/lib/api/client";

type State = {
  /** Si existe, sobre-escribe ENV.API_BASE_URL (útil para APK / cambiar entre local y desplegado) */
  apiBaseUrlOverride: string | null;
};

type Actions = {
  setApiBaseUrlOverride: (url: string | null) => void;
  clearApiBaseUrlOverride: () => void;
};

export const useAppSettings = create<State & Actions>()(
  persist(
    (set) => ({
      apiBaseUrlOverride: null,

      setApiBaseUrlOverride(url) {
        const v = (url ?? "").trim();
        const next = v ? v : null;
        set({ apiBaseUrlOverride: next });
        setApiBaseUrl(next);
      },

      clearApiBaseUrlOverride() {
        set({ apiBaseUrlOverride: null });
        setApiBaseUrl(null);
      },
    }),
    {
      name: "app.settings",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // al iniciar la app, aplicar override si existe
        if (state?.apiBaseUrlOverride) {
          setApiBaseUrl(state.apiBaseUrlOverride);
        }
      },
    }
  )
);
