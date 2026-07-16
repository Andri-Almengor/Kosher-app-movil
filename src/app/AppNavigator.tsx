// src/app/AppNavigator.tsx
import React from "react";
import { Platform, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import ProductListScreen from "../features/products/screens/ProductListScreen";
import ProductDetailScreen from "../features/products/screens/ProductDetailScreen";
import StoreMapScreen from "../features/stores/screens/StoreMapScreen";
import FavoritesScreen from "../features/products/screens/FavoritesScreen";
import LoginScreen from "@/app/auth/LoginScreen";
import NewsListScreen from "../features/news/screens/NewsListScreen";
import NewsDetailScreen from "../features/news/screens/NewsDetailScreen";
import CalendarScreen from "@/features/calendar/screens/CalendarScreen";

import { useAuth } from "./auth/authStore";
import { AdminNavigator } from "@/navigation/AdminNavigator";
import { useI18n } from "@/i18n/I18nProvider";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const headerCommon: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: "#fff" },
  headerTitleStyle: { fontSize: 18, fontWeight: "800", color: "#111" },
  headerShadowVisible: false,
  animation: Platform.OS === "android" ? "fade" : "default",
};

function ProductsStack() {
  const { t } = useI18n();
  return (
    <Stack.Navigator screenOptions={headerCommon}>
      <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: t("products") }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: t("detail") }} />
      <Stack.Screen name="AdminAuth" component={LoginScreen} options={{ title: t("adminAccess"), presentation: "modal" }} />
    </Stack.Navigator>
  );
}

function StoresStack() {
  const { t } = useI18n();
  return (
    <Stack.Navigator screenOptions={headerCommon}>
      <Stack.Screen name="StoreMap" component={StoreMapScreen} options={{ title: t("stores") }} />
    </Stack.Navigator>
  );
}

function FavoritesStack() {
  const { t } = useI18n();
  return (
    <Stack.Navigator screenOptions={headerCommon}>
      <Stack.Screen name="Favs" component={FavoritesScreen} options={{ title: t("favorites") }} />
      <Stack.Screen name="FavDetail" component={ProductDetailScreen} options={{ title: t("detail") }} />
    </Stack.Navigator>
  );
}

function NewsStack() {
  const { t } = useI18n();
  return (
    <Stack.Navigator screenOptions={headerCommon}>
      <Stack.Screen name="News" component={NewsListScreen} options={{ title: t("news") }} />
      <Stack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ title: t("detail") }} />
    </Stack.Navigator>
  );
}

function CalendarStack() {
  const { t } = useI18n();
  return (
    <Stack.Navigator screenOptions={headerCommon}>
      <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: t("calendar") }} />
    </Stack.Navigator>
  );
}

// ✅ Ocultar TabBar en pantallas de detalle
function shouldHideTabBar(route: any) {
  const routeName = route?.state?.routes?.[route.state.index]?.name;
  const hideOnScreens = ["ProductDetail", "FavDetail", "NewsDetail"];
  return hideOnScreens.includes(routeName);
}

export function AppNavigator() {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  const iconMap: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
    Home: "list-outline",
    Tiendas: "map-outline",
    Guardados: "heart-outline",
    Noticias: "newspaper-outline",
    Calendario: "calendar-outline",
    Admin: "construct-outline",
  };

  const labelMap: Record<string, string> = {
    Home: t("products"),
    Tiendas: t("stores"),
    Guardados: t("favorites"),
    Noticias: t("news"),
    Calendario: t("calendar"),
    Admin: "Admin",
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#111",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          backgroundColor: "#fff",
          height: 60 + bottom,
          paddingBottom: bottom,
          paddingTop: 10,
          borderTopWidth: 0,
          elevation: 10,
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabel: labelMap[route.name] ?? route.name,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "800" },
        tabBarItemStyle: { borderRadius: 16, marginHorizontal: 6, paddingVertical: 2 },
        tabBarIcon: ({ color, size, focused }) => (
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={iconMap[route.name] ?? "ellipse-outline"} size={focused ? size + 2 : size} color={color} />
          </View>
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={ProductsStack}
        options={({ route }) => ({
          tabBarStyle: shouldHideTabBar(route) ? { display: "none" } : undefined,
        })}
      />
      <Tab.Screen name="Tiendas" component={StoresStack} />
      <Tab.Screen name="Calendario" component={CalendarStack} />
      <Tab.Screen
        name="Guardados"
        component={FavoritesStack}
        options={({ route }) => ({
          tabBarStyle: shouldHideTabBar(route) ? { display: "none" } : undefined,
        })}
      />
      <Tab.Screen
        name="Noticias"
        component={NewsStack}
        options={({ route }) => ({
          tabBarStyle: shouldHideTabBar(route) ? { display: "none" } : undefined,
        })}
      />
      {isAdmin ? <Tab.Screen name="Admin" component={AdminNavigator} /> : null}
    </Tab.Navigator>
  );
}
