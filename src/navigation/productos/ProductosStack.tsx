import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProductosHomeScreen } from "@/screens/productos/ProductosHomeScreen";
import { CategoriaScreen } from "@/screens/productos/CategoriaScreen";
import { ProductoDetalleScreen } from "@/screens/productos/ProductoDetalleScreen";

export type ProductosStackParamList = {
  ProductosHome: { resetKey?: number; initialQuery?: string } | undefined;
  ProductosCategoria: { catGeneral: string };
  ProductoDetalle: { productoId: number | string };
};

const Stack = createNativeStackNavigator<ProductosStackParamList>();

export function ProductosStack() {
  return (
    <Stack.Navigator
      initialRouteName="ProductosHome"
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
      }}
    >
      <Stack.Screen name="ProductosHome" component={ProductosHomeScreen} />
      <Stack.Screen name="ProductosCategoria" component={CategoriaScreen} />
      <Stack.Screen name="ProductoDetalle" component={ProductoDetalleScreen} />
    </Stack.Navigator>
  );
}

export default ProductosStack;
