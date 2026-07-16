import React from "react";
import { View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigatorScreenParams } from "@react-navigation/native";
import { HomeScreen } from "@/screens/home/HomeScreen";
import { ProductosStack, type ProductosStackParamList } from "@/navigation/productos/ProductosStack";
import { NovedadesStack, type NovedadesStackParamList } from "@/navigation/novedades/NovedadesStack";
import { RestaurantesStack, type RestaurantesStackParamList } from "@/navigation/restaurantes/RestaurantesStack";
import { DonacionesScreen } from "@/screens/donaciones/DonacionesScreen";
import { AppIcon } from "@/components/AppIcon";
import { emitTabReset } from "@/lib/ui/tabReset";
import { setCurrentTab } from "@/lib/ui/activeTab";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SwipeTabContainer } from "@/navigation/SwipeTabContainer";
import { navigateToTabHome } from "@/navigation/tabNavigation";

export type MainTabsParamList = {
  Inicio: undefined;
  Productos: NavigatorScreenParams<ProductosStackParamList> | undefined;
  Novedades: NavigatorScreenParams<NovedadesStackParamList> | undefined;
  Restaurantes: NavigatorScreenParams<RestaurantesStackParamList> | undefined;
  Donaciones: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const { palette: c } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const veryCompact = width < 350;
  const tabHeight = (veryCompact ? 64 : compact ? 66 : 70) + bottomInset;

  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: "shift",
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarAllowFontScaling: false,
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: {
          fontSize: veryCompact ? 8.6 : compact ? 9.4 : 10.5,
          lineHeight: veryCompact ? 10 : compact ? 11 : 13,
          fontWeight: "800",
          paddingBottom: 0,
          includeFontPadding: false,
          textAlign: "center",
        },
        tabBarStyle: {
          minHeight: tabHeight,
          height: tabHeight,
          borderTopWidth: 0,
          paddingTop: veryCompact ? 5 : compact ? 6 : 8,
          paddingBottom: bottomInset,
          backgroundColor: c.card,
          elevation: 8,
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarItemStyle: {
          paddingBottom: 2,
          minHeight: veryCompact ? 48 : compact ? 50 : 52,
          flex: 1,
        },
        tabBarBackground: () => <View style={{ flex: 1, backgroundColor: c.card }} />,
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === "Inicio") return <AppIcon name="home" size={(compact ? 20 : (size ?? 22)) + (focused ? 1 : 0)} opacity={focused ? 1 : 0.72} />;
          if (route.name === "Productos") return <AppIcon name="lista" size={(compact ? 20 : (size ?? 22)) + (focused ? 1 : 0)} opacity={focused ? 1 : 0.72} />;
          if (route.name === "Novedades") return <AppIcon name="novedades" size={(compact ? 20 : (size ?? 22)) + (focused ? 1 : 0)} opacity={focused ? 1 : 0.72} />;
          if (route.name === "Restaurantes") return <AppIcon name="restYComer" size={(compact ? 20 : (size ?? 22)) + (focused ? 1 : 0)} opacity={focused ? 1 : 0.72} />;
          return <Ionicons name={focused ? "heart" : "heart-outline"} size={compact ? 20 : (size ?? 22)} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Inicio"
        options={{ tabBarLabel: t("home") }}
        listeners={{ focus: () => { setCurrentTab("Inicio"); emitTabReset("Inicio"); } }}
      >
        {() => (
          <SwipeTabContainer currentTab="Inicio">
            <HomeScreen />
          </SwipeTabContainer>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Productos"
        options={{ tabBarLabel: t("products") }}
        listeners={({ navigation }) => ({
          focus: () => { setCurrentTab("Productos"); emitTabReset("Productos"); },
          tabPress: (e) => {
            e.preventDefault();
            emitTabReset("Productos");
            navigateToTabHome(navigation, "Productos");
          },
        })}
      >
        {() => (
          <SwipeTabContainer currentTab="Productos">
            <ProductosStack />
          </SwipeTabContainer>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Novedades"
        options={{ tabBarLabel: t("news") }}
        listeners={({ navigation }) => ({
          focus: () => { setCurrentTab("Novedades"); emitTabReset("Novedades"); },
          tabPress: (e) => {
            e.preventDefault();
            emitTabReset("Novedades");
            navigateToTabHome(navigation, "Novedades");
          },
        })}
      >
        {() => (
          <SwipeTabContainer currentTab="Novedades">
            <NovedadesStack />
          </SwipeTabContainer>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Restaurantes"
        options={{ tabBarLabel: t("restaurantsTab") }}
        listeners={({ navigation }) => ({
          focus: () => { setCurrentTab("Restaurantes"); emitTabReset("Restaurantes"); },
          tabPress: (e) => {
            e.preventDefault();
            emitTabReset("Restaurantes");
            navigateToTabHome(navigation, "Restaurantes");
          },
        })}
      >
        {() => (
          <SwipeTabContainer currentTab="Restaurantes">
            <RestaurantesStack />
          </SwipeTabContainer>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Donaciones"
        options={{ tabBarLabel: t("donations") }}
        listeners={{ focus: () => { setCurrentTab("Donaciones"); emitTabReset("Donaciones"); } }}
      >
        {() => (
          <SwipeTabContainer currentTab="Donaciones">
            <DonacionesScreen />
          </SwipeTabContainer>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default MainTabs;
