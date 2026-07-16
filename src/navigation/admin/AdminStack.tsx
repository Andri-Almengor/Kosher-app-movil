import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AdminHomeScreen } from "@/screens/admin/AdminHomeScreen";
import { AdminProductosScreen } from "@/screens/admin/AdminProductosScreen";
import { AdminImportScreen } from "@/screens/admin/AdminImportScreen";

export type AdminStackParamList = {
  AdminHome: undefined;
  AdminProductos: undefined;
  AdminImport: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      <Stack.Screen name="AdminProductos" component={AdminProductosScreen} />
      <Stack.Screen name="AdminImport" component={AdminImportScreen} />
    </Stack.Navigator>
  );
}
