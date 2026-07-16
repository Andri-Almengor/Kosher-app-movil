import { CommonActions } from "@react-navigation/native";

export const MAIN_TAB_ORDER = ["Inicio", "Productos", "Novedades", "Restaurantes", "Donaciones"] as const;

export type MainTabName = (typeof MAIN_TAB_ORDER)[number];

export function getInitialRouteForTab(tab: MainTabName, resetKey = Date.now()) {
  if (tab === "Productos") {
    return { screen: "ProductosHome", params: { resetKey } };
  }

  if (tab === "Novedades") {
    return {
      screen: "NovedadesHome",
      params: {
        resetKey,
        restaurantId: null,
        mode: null,
        fromRestaurant: null,
      },
    };
  }

  if (tab === "Restaurantes") {
    return { screen: "RestaurantesHome", params: { resetKey } };
  }

  return undefined;
}

export function navigateToTabHome(navigation: any, tab: MainTabName) {
  const params = getInitialRouteForTab(tab);
  navigation.dispatch(
    CommonActions.navigate({
      name: tab,
      params,
    })
  );
}
