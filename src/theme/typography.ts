// src/theme/typography.ts
import { AppFonts } from "./fonts";

/**
 * Reglas:
 * - Títulos: Poppins SemiBold (con sensación de negrita)
 * - Subtítulos / texto normal: Poppins Regular
 * - Texto en botones: Poppins Medium Italic
 * - Texto del SearchBar: Montserrat Regular (aplicado en SearchBar)
 */
export const typography = {
  title: {
    fontFamily: AppFonts.poppinsSemiBold,
    // En Android/iOS con fuentes custom, fontWeight no siempre aplica,
    // pero ayuda a reforzar visualmente donde sea compatible.
    fontWeight: "800" as const,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: AppFonts.poppinsRegular,
  },
  body: {
    fontFamily: AppFonts.poppinsRegular,
  },
  button: {
    fontFamily: AppFonts.poppinsMediumItalic,
  },
  search: {
    fontFamily: AppFonts.montserratRegular,
  },
} as const;
