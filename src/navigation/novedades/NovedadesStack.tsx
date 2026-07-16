import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NovedadesScreen } from "@/screens/novedades/NovedadesScreen";
import { NovedadDetalleScreen } from "@/screens/novedades/NovedadDetalleScreen";

export type NovedadesStackParamList = {
  NovedadesHome:
    | {
        resetKey?: number;
        initialQuery?: string;
        restaurantId?: number | null;
        mode?: "NOVEDADES" | "ANUNCIANTES" | null;
        fromRestaurant?: boolean | null;
      }
    | undefined;
  NovedadDetalle: { newsId: number };
};

const Stack = createNativeStackNavigator<NovedadesStackParamList>();

export function NovedadesStack() {
  return (
    <Stack.Navigator
      initialRouteName="NovedadesHome"
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
      }}
    >
      <Stack.Screen name="NovedadesHome" component={NovedadesScreen} />
      <Stack.Screen name="NovedadDetalle" component={NovedadDetalleScreen} />
    </Stack.Navigator>
  );
}

export default NovedadesStack;
