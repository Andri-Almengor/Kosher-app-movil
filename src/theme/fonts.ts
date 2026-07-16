// src/theme/fonts.ts
// Reglas oficiales de tipografía:
// - Poppins: títulos / subtítulos / texto normal / botones
// - Montserrat: barra de búsqueda (SearchBar)
export const AppFonts = {
  poppinsRegular: "Poppins_400Regular",
  poppinsSemiBold: "Poppins_600SemiBold",
  poppinsMediumItalic: "Poppins_500Medium_Italic",
  montserratRegular: "Montserrat_400Regular",
} as const;

export type AppFontKey = keyof typeof AppFonts;
