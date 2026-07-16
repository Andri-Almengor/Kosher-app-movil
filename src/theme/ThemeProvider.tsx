import { createContext, useContext, PropsWithChildren, useMemo } from "react";
import { useColorScheme } from "react-native";
import { tokens } from "./tokens";
import { useThemeStore } from "@/app/theme/themeStore";

type Theme = typeof tokens & {
  mode: "light" | "dark";
  palette: typeof tokens.colors;
  preference: "system" | "light" | "dark";
};

const ThemeCtx = createContext<Theme | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const sys = useColorScheme();
  const pref = useThemeStore((s) => s.mode);

  const mode: "light" | "dark" =
    pref === "system" ? ((sys ?? "light") as any) : (pref as any);

  const val = useMemo(
    () => ({
      ...tokens,
      mode,
      preference: pref,
      palette: mode === "light" ? tokens.colors : tokens.dark,
    }),
    [mode, pref]
  );

  return <ThemeCtx.Provider value={val}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
