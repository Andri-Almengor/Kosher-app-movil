import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";

const icons = {
  busqueda: require("../../assets/custom-icons/busqueda.png"),
  filtros: require("../../assets/custom-icons/filtros.png"),
  espanol: require("../../assets/custom-icons/espanol.png"),
  ingles: require("../../assets/custom-icons/ingles.png"),
  home: require("../../assets/custom-icons/home.png"),
  lista: require("../../assets/custom-icons/lista.png"),
  novedades: require("../../assets/custom-icons/novedades.png"),
  restYComer: require("../../assets/custom-icons/rest-y-comer.png"),
  ubicacion: require("../../assets/custom-icons/ubicacion.png"),
  masInformacion: require("../../assets/custom-icons/mas-informacion.png"),
} as const;

export type AppIconName = keyof typeof icons;

type Props = {
  name: AppIconName;
  size?: number;
  style?: StyleProp<ImageStyle>;
  opacity?: number;
};

export const AppIcon = React.memo(function AppIcon({ name, size = 20, style, opacity = 1 }: Props) {
  return (
    <Image
      source={icons[name]}
      resizeMode="contain"
      fadeDuration={0}
      style={[{ width: size, height: size, opacity }, style]}
    />
  );
});

export default AppIcon;
