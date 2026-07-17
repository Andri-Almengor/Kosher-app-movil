import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "@/lib/notifications/notificationNavigation";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RootDrawer from "@/navigation/RootDrawer";
import LoginScreen from "@/auth/LoginScreen";
import { ProductHoldPreviewProvider } from "@/components/ProductHoldPreviewProvider";

export type RootStackParamList = {
  Root: undefined;
  AdminAuth: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <ProductHoldPreviewProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Root" component={RootDrawer} />
          <Stack.Screen
            name="AdminAuth"
            component={LoginScreen}
            options={{ presentation: "modal" }}
          />
        </Stack.Navigator>
      </ProductHoldPreviewProvider>
    </NavigationContainer>
  );
}

export { RootNavigator };
