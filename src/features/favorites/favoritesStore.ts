// src/features/favorites/favoritesStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export const GUEST_USER_KEY = "guest";

type FavoritesStore = {
  favorites: number[];
  initialized: boolean;
  userKey: string; // "guest" o id de usuario
  setUserKey: (userKey: string) => Promise<void>;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (productId: number) => Promise<void>;
};

async function resolveStorageKey(userKey: string) {
  // Invitado → por dispositivo
  if (userKey === GUEST_USER_KEY) {
    let deviceId = await AsyncStorage.getItem("@kccr_device_id");
    if (!deviceId) {
      // Generamos un id simple sin dependencias externas
      deviceId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await AsyncStorage.setItem("@kccr_device_id", deviceId);
    }
    return `@favorites_device_${deviceId}`;
  }

  // Usuario logueado → por id de usuario
  return `@favorites_user_${userKey}`;
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favorites: [],
  initialized: false,
  userKey: GUEST_USER_KEY,

  // Cambiar de usuario/invitado y recargar favoritos
  setUserKey: async (userKey: string) => {
    set({ userKey, favorites: [], initialized: false });

    const storageKey = await resolveStorageKey(userKey);
    const raw = await AsyncStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];

    set({ favorites: parsed, initialized: true });
  },

  // Por si quieres forzar recarga manual
  loadFavorites: async () => {
    const { userKey } = get();
    const storageKey = await resolveStorageKey(userKey);
    const raw = await AsyncStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    set({ favorites: parsed, initialized: true });
  },

  toggleFavorite: async (productId: number) => {
    const { userKey, favorites } = get();
    const storageKey = await resolveStorageKey(userKey);

    let updated: number[];
    if (favorites.includes(productId)) {
      updated = favorites.filter((id) => id !== productId);
    } else {
      updated = [...favorites, productId];
    }

    set({ favorites: updated });
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  },
}));
