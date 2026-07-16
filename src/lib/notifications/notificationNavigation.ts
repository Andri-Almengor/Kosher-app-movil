import { createNavigationContainerRef } from "@react-navigation/native";
import type { PushNotificationData } from "@/lib/notifications/pushNotifications";

export const navigationRef = createNavigationContainerRef<any>();

function toNumberLike(value: unknown): number | string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const asNumber = Number(text);
  return Number.isFinite(asNumber) ? asNumber : text;
}

function hasRoute(name: string) {
  try {
    return navigationRef.getRootState()?.routeNames?.includes(name);
  } catch {
    return false;
  }
}

function navigateToMainTab(tab: string, nested?: { screen: string; params?: any }) {
  if (hasRoute("Root")) {
    navigationRef.navigate("Root", {
      screen: "Tabs",
      params: nested ? { screen: tab, params: nested } : { screen: tab },
    });
    return true;
  }

  // Compatibilidad con la navegación alternativa de src/app/AppNavigator.tsx
  if (tab === "Productos" && hasRoute("Home")) {
    navigationRef.navigate("Home", nested ? { screen: nested.screen, params: nested.params } : undefined);
    return true;
  }
  if (tab === "Novedades" && hasRoute("Noticias")) {
    navigationRef.navigate("Noticias", nested ? { screen: nested.screen === "NovedadDetalle" ? "NewsDetail" : nested.screen, params: nested.params } : undefined);
    return true;
  }
  if (tab === "Restaurantes" && hasRoute("Tiendas")) {
    navigationRef.navigate("Tiendas", nested ? { screen: nested.screen, params: nested.params } : undefined);
    return true;
  }

  if (hasRoute(tab)) {
    navigationRef.navigate(tab as never);
    return true;
  }

  return false;
}

export function navigateFromPushData(data: PushNotificationData) {
  if (!navigationRef.isReady()) return false;

  const screen = String(data.screen || data.type || "").toLowerCase();

  const newsId = toNumberLike(data.newsId ?? data.id);
  const productoId = toNumberLike(data.productoId ?? data.id);
  const restauranteId = toNumberLike(data.restauranteId ?? data.id);

  if ((screen.includes("news") || screen.includes("novedad")) && newsId != null) {
    return navigateToMainTab("Novedades", { screen: "NovedadDetalle", params: { newsId: Number(newsId) } });
  }

  if ((screen.includes("product") || screen.includes("producto")) && productoId != null) {
    return navigateToMainTab("Productos", { screen: "ProductoDetalle", params: { productoId } });
  }

  if ((screen.includes("restaurant") || screen.includes("restaurante") || screen.includes("comercio")) && restauranteId != null) {
    return navigateToMainTab("Restaurantes", { screen: "RestauranteDetalle", params: { restauranteId } });
  }

  if (screen.includes("news") || screen.includes("novedad")) {
    return navigateToMainTab("Novedades");
  }

  if (screen.includes("product") || screen.includes("producto")) {
    return navigateToMainTab("Productos");
  }

  if (screen.includes("restaurant") || screen.includes("restaurante") || screen.includes("comercio")) {
    return navigateToMainTab("Restaurantes");
  }

  return navigateToMainTab("Inicio") || navigateToMainTab("Home");
}
