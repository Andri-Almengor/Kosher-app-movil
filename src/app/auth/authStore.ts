// src/app/auth/authStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureJsonStorage } from "@/lib/secureJsonStorage";
import { loginApi, type BackendUser } from "./authApi";
import { setAuthToken } from "@/lib/api/client";
import { clearSensitiveOfflineData } from "@/offline/sqliteStore";
import { Buffer } from "buffer";
import {
  useFavoritesStore,
  GUEST_USER_KEY,
} from "@/features/favorites/favoritesStore";

export type Role = "guest" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type State = {
  user: User | null;
  role: Role;
  token: string | null;
  hydrated: boolean;
};

type Actions = {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
};


function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64").toString("utf8"));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function mapBackendRole(rol: string | null | undefined): Role {
  return rol === "admin" ? "admin" : "guest";
}

function mapBackendUser(u: BackendUser): User {
  return {
    id: String(u.id),
    name: u.nombre,
    email: u.email,
    role: mapBackendRole(u.rol),
  };
}

export const useAuth = create<State & Actions>()(
  persist(
    (set, get) => ({
      user: null,
      role: "guest",
      token: null,
      hydrated: false,

      async login(email, password) {
        const { token, user } = await loginApi(email, password);
        const mapped = mapBackendUser(user);

        setAuthToken(token);
        set({ user: mapped, role: mapped.role, token });

        // 👉 configurar favoritos para este usuario (id de usuario)
        await useFavoritesStore.getState().setUserKey(mapped.id);
      },

      async logout() {
        setAuthToken(null);
        set({ user: null, role: "guest", token: null });
        try { await clearSensitiveOfflineData(); } catch {}

        // 👉 volver a key de invitado (device)
        void useFavoritesStore.getState().setUserKey(GUEST_USER_KEY);
      },

      isAuthenticated() {
        // autenticado = admin logueado
        return !!get().user && get().role === "admin";
      },

      isAdmin() {
        return get().role === "admin";
      },
    }),
    {
      name: "auth",
      storage: createJSONStorage(() => secureJsonStorage),
      onRehydrateStorage: () => (state) => {
        // Cuando la app arranca, restaurar token y configurar favoritos
        if (state?.token && state.user && !isTokenExpired(state.token)) {
          setAuthToken(state.token);
          // cargar favoritos del usuario
          void useFavoritesStore
            .getState()
            .setUserKey(state.user.id ?? GUEST_USER_KEY);
        } else {
          setAuthToken(null);
          useAuth.setState({ user: null, role: "guest", token: null });
          // invitado
          void useFavoritesStore.getState().setUserKey(GUEST_USER_KEY);
        }
        try {
          useAuth.setState({ hydrated: true });
        } catch {}
      },
    }
  )
);
