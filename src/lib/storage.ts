import * as SecureStore from "expo-secure-store";

const KEY = "kccr_auth";

export type AuthState = {
  token: string;
  user: { id: number; email: string; nombre?: string; role?: string };
};

export async function saveAuth(auth: AuthState | null) {
  if (!auth) {
    await SecureStore.deleteItemAsync(KEY);
    return;
  }
  await SecureStore.setItemAsync(KEY, JSON.stringify(auth));
}

export async function loadAuth(): Promise<AuthState | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}
