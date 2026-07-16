// src/theme/useAppFonts.ts
import { useFonts } from "expo-font";

// Google Fonts (Expo). Requiere:
//   expo install expo-font @expo-google-fonts/poppins @expo-google-fonts/montserrat
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_500Medium_Italic,
} from "@expo-google-fonts/poppins";
import { Montserrat_400Regular } from "@expo-google-fonts/montserrat";

export function useAppFonts() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_500Medium_Italic,
    Montserrat_400Regular,
  });

  return loaded;
}
