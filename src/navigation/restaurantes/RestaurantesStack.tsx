import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RestaurantesHomeScreen } from "@/screens/restaurantes/RestaurantesHomeScreen";
import { RestauranteDetalleScreen } from "@/screens/restaurantes/RestauranteDetalleScreen";

export type RestaurantesStackParamList = {
  RestaurantesHome: { resetKey?: number; initialQuery?: string } | undefined;
  RestauranteDetalle: { restauranteId: number | string };
};

const Stack = createNativeStackNavigator<RestaurantesStackParamList>();

export function RestaurantesStack() {
  return (
    <Stack.Navigator
      initialRouteName="RestaurantesHome"
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
      }}
    >
      <Stack.Screen name="RestaurantesHome" component={RestaurantesHomeScreen} />
      <Stack.Screen name="RestauranteDetalle" component={RestauranteDetalleScreen} />
    </Stack.Navigator>
  );
}

export default RestaurantesStack;
