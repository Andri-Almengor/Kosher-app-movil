import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { MainTabs } from "@/navigation/MainTabs";
import { AdminNavigator } from "@/navigation/AdminNavigator";
import CustomDrawerContent  from "@/navigation/drawer/CustomDrawerContent";
import { useAuth } from "@/app/auth/authStore";
import { useTheme } from "@/theme/ThemeProvider";
import { AppFonts } from "@/theme/fonts";
import { useI18n } from "@/i18n/I18nProvider";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AppIcon } from "@/components/AppIcon";

export type DrawerParamList = {
  Tabs: undefined;
  Admin: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

export function RootDrawer() {
  const { t } = useI18n();
  const { palette: c } = useTheme();
  const isAdmin = useAuth((s) => s.isAdmin());

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerActiveTintColor: c.primary,
        drawerInactiveTintColor: c.text,
        drawerLabelStyle: { fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", letterSpacing: 0.2, fontSize: 16 },
      }}
      drawerContent={(props) => (
        <CustomDrawerContent {...props} isAdmin={isAdmin} />
      )}
    >
      <Drawer.Screen
        name="Tabs"
        component={MainTabs}
        options={{
          drawerLabel: "",
          title: t("drawerHome"),
          drawerIcon: ({ size }) => <AppIcon name="home" size={size} />,
        }}
      />
      {isAdmin ? (
        <Drawer.Screen
          name="Admin"
          component={AdminNavigator}
          options={{
            drawerLabel: "",
            title: t("drawerAdmin"),
            drawerIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" size={size} color={color} />,
          }}
        />
      ) : null}
    </Drawer.Navigator>
  );
}
export default RootDrawer ;
