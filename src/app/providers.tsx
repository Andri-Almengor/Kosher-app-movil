import React, { PropsWithChildren } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";
import { useAppFonts } from "@/theme/useAppFonts";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { PushNotificationsBootstrap } from "@/lib/notifications/PushNotificationsBootstrap";
import { navigationRef } from "@/lib/notifications/notificationNavigation";

/**
 * Nota: Auth se maneja con zustand (src/app/auth/authStore.ts), no requiere Provider.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Auto-refresh global (foreground). In background, React Query will *attempt* to keep refetching,
      // but the OS may suspend JS timers depending on platform/battery settings.
      refetchInterval: 4000,
      refetchIntervalInBackground: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
  },
});
function NavWithTheme({ children }: PropsWithChildren) {
  const { mode, palette: c } = useTheme();

  const navTheme: Theme =
    mode === "dark"
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: c.bg,
            card: c.card,
            text: c.text,
            border: c.border,
            primary: c.primary,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            background: c.bg,
            card: c.card,
            text: c.text,
            border: c.border,
            primary: c.primary,
          },
        };

  return <NavigationContainer ref={navigationRef} theme={navTheme}>{children}</NavigationContainer>;
}

export function Providers({ children }: PropsWithChildren) {
  const fontsReady = useAppFonts();
  if (!fontsReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <>
              <PushNotificationsBootstrap />
              <NavWithTheme>{children}</NavWithTheme>
            </>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
