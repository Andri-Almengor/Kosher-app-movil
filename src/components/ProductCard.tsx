import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { AppFonts } from "@/theme/fonts";
import { CachedImage } from "@/components/CachedImage";
import { localizeProduct } from "@/features/products/utils/localizeProduct";

export type ProductCardItem = {
  id: string | number;
  nombre: string;
  nombreEn?: string | null;
  fotoProducto?: string | null;

  tienda?: string | null;
  tiendaEn?: string | null;
  fabricanteMarca?: string | null;
  fabricanteMarcaEn?: string | null;

  atributo1?: string | null;
  atributo2?: string | null;
  atributo3?: string | null;

  certifica?: string | null;
  sello?: string | null;
  fotoSello1?: string | null;
  fotoSello2?: string | null;

  categoria?: string | null;
  categoria1?: string | null;
};

type Props = {
  item: ProductCardItem;
  onPress?: () => void;
};

function getAtributoBadgeColor(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "parve") return "#16a34a";
  if (normalized === "dairy" || normalized === "lácteo") return "#2563eb";
  if (normalized === "bazar") return "#dc2626";

  return "#eab308";
}

export const ProductCard = memo(function ProductCard({ item, onPress }: Props) {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const { width } = useWindowDimensions();
  const compact = width < 380;

  const localized = useMemo(() => {
    if ((item as any)?.__localizedLang === lang) return item as any;
    const maybeBilingual =
      (item as any)?.nombreEn ||
      (item as any)?.catGeneralEn ||
      (item as any)?.tiendaEn ||
      (item as any)?.fabricanteMarcaEn;
    return maybeBilingual ? localizeProduct(item as any, lang) : (item as any);
  }, [item, lang]);

  const chips = [localized.atributo1, localized.atributo2, localized.atributo3].filter(
    (x): x is string => !!x && String(x).trim().length > 0
  );

  const sealImage = localized.fotoSello1 || localized.fotoSello2 || null;
  const tienda = localized.tienda?.trim() || "";
  const subtitle =
    (localized.fabricanteMarca?.trim() || localized.fabricanteMarcaEn?.trim() || "").trim();

  const atributo1Color = getAtributoBadgeColor(chips[0]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.imageWrap}>
        {item.fotoProducto ? (
          <CachedImage uri={item.fotoProducto} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.emptyImage, { backgroundColor: colors.muted }]}> 
            <Text style={[styles.emptyImageText, { color: colors.text, opacity: 0.78 }]}> 
              {lang === "en"
                ? "This product does not have an image"
                : "Este producto no cuenta con una imagen"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
          {localized.nombre}
        </Text>

        <Text numberOfLines={1} style={[styles.sub, { color: colors.text, opacity: 0.65 }]}>
          {subtitle || t("na")}
        </Text>

        <View style={styles.bottomRow}>
          <View style={styles.sealWrap}>
            <View style={styles.certPillLarge}>
              {sealImage ? (
                <CachedImage uri={sealImage} style={styles.sealImageLarge} resizeMode="contain" />
              ) : (
                <Text numberOfLines={1} style={styles.certText}>
                  {t("na")}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.rightColumn, compact && styles.rightColumnCompact]}>
            {!!chips[0] && (
              <View style={[styles.attributePill, { backgroundColor: atributo1Color }]}> 
                <Text style={styles.attributeText}>{String(chips[0]).toUpperCase()}</Text>
              </View>
            )}

            <View
              style={[
                styles.storePillSmall,
                { backgroundColor: colors.muted, borderColor: colors.border },
                compact && styles.storePillCompact,
              ]}
            >
              <Text
                numberOfLines={2}
                style={[styles.storeText, { color: colors.tiendatext, opacity: 0.9 }]}
              >
                {tienda || t("na")}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    flex: 1,
    marginBottom: 12,
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 1.15,
    padding: 12,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    resizeMode: "contain",
  },
  emptyImage: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  emptyImageText: {
    textAlign: "center",
    fontSize: 10,
    lineHeight: 18,
    fontFamily: AppFonts.poppinsMediumItalic,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 3,
  },
  name: {
    fontSize: 17,
    fontFamily: AppFonts.poppinsSemiBold,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  sub: {
    fontSize: 13,
    fontFamily: AppFonts.poppinsRegular,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 10,
    marginTop: 10,
  },
  sealWrap: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "flex-end",
  },
  rightColumn: {
    width: 96,
    alignItems: "stretch",
    justifyContent: "flex-end",
    gap: 8,
    flexShrink: 0,
  },
  rightColumnCompact: {
    width: 88,
    gap: 6,
  },
  storePillSmall: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    width: "80%",
    left: 28,
    minHeight: 74,
    justifyContent: "center",
  },
  storePillCompact: {
    minHeight: 6,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  storeText: {
    fontSize: 10,
    fontFamily: AppFonts.poppinsSemiBold,
    fontWeight: "800",
    letterSpacing: 0.2,
    minWidth: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  attributePill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 2,
    left: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  attributeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: AppFonts.poppinsSemiBold,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  certPillLarge: {
    width: 76,
    height: 76,
    borderRadius: 0,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: 0,
  },
  sealImageLarge: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    backgroundColor: "transparent",
  },
  certText: {
    fontSize: 11,
    fontFamily: AppFonts.poppinsSemiBold,
    color: "#111827",
    textAlign: "center",
    lineHeight: 16,
  },
});
