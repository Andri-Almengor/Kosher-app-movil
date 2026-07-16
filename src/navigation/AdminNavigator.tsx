import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useI18n } from "@/i18n/I18nProvider";
import AdminHomeScreen from "../features/admin/screens/AdminHomeScreen";
import AdminProductsScreen from "../features/admin/screens/AdminProductsScreen";
import AdminUsersScreen from "../features/admin/screens/AdminUsersScreen";
import AdminNewsScreen from "../features/admin/screens/AdminNewsScreen";
import AdminLogsScreen from "../features/admin/screens/AdminLogsScreen";
import AdminRestaurantsScreen from "@/features/admin/screens/AdminRestaurantsScreen";

export type AdminStackParamList = {
  AdminHome: { resetKey?: number } | undefined;
  AdminProducts: undefined;
  AdminUsers: undefined;
  AdminNews: undefined;
  AdminLogs: undefined;
  AdminRestaurants: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminNavigator() {
  const { t } = useI18n();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitleStyle: { fontSize: 18, fontWeight: "800" },
        contentStyle: { backgroundColor: "#f8fafc" },
      }}
    >
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: t("adminTitle"), headerShown: false }} />
      <Stack.Screen name="AdminProducts" component={AdminProductsScreen} options={{ title: t("products") }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: t("users") }} />
      <Stack.Screen name="AdminNews" component={AdminNewsScreen} options={{ title: t("news") }} />
      <Stack.Screen name="AdminRestaurants" component={AdminRestaurantsScreen} options={{ title: t("restaurantsTitle") }} />
      <Stack.Screen name="AdminLogs" component={AdminLogsScreen} options={{ title: t("logs") }} />
    </Stack.Navigator>
  );
}
