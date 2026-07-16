import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { api, setAuthToken } from "@/lib/api";
import { storage } from "@/lib/storage";

type AuthState = {
  token: string | null;
  role: "admin" | "user" | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<AuthState["role"]>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await storage.get("auth_token");
        const savedRole = await storage.get("auth_role");
        if (saved) {
          setAuthToken(saved);
          setToken(saved);
          setRole((savedRole as any) ?? "user");
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      role,
      isLoading,
      signIn: async (email, password) => {
        try {
          // Backend esperado: POST /api/auth/login -> { token, user: { role } }
          const res = await api.post("/auth/login", { email, password });
          const t = res.data?.token as string | undefined;
          const r = (res.data?.user?.role ?? res.data?.role ?? "user") as AuthState["role"];
          if (!t) throw new Error("Respuesta de login inválida");
          await storage.set("auth_token", t);
          await storage.set("auth_role", r ?? "user");
          setAuthToken(t);
          setToken(t);
          setRole(r ?? "user");
          return true;
        } catch (e: any) {
          Alert.alert("No se pudo iniciar sesión", e?.response?.data?.error ?? e?.message ?? "Error");
          return false;
        }
      },
      signOut: async () => {
        await storage.remove("auth_token");
        await storage.remove("auth_role");
        setAuthToken(null);
        setToken(null);
        setRole(null);
      },
    }),
    [token, role, isLoading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
