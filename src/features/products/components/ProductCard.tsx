// src/features/products/components/ProductCard.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import Card from "@/ui/Card";
import { useI18n } from "@/i18n/I18nProvider";
import { TranslatedText } from "@/components/TranslatedText";
import Button from "@/ui/Button";
import type { Product } from "../api/types";
import { isHttpUrl } from "@/utils/format";

type Props = {
  item: Product;
  saved: boolean;
  onToggle: () => void;
  onPress?: () => void;
  disabled?: boolean;
};

export const ProductCard = React.memo(function ProductCard({ item, saved, onToggle, onPress, disabled }: Props) {
  const { t } = useI18n();
  const hasProductImage = isHttpUrl(item.imgProd ?? undefined);
  const hasSealLogo = isHttpUrl(item.logoSello ?? undefined);
  const hasGfLogo = isHttpUrl(item.logoGf ?? undefined);

  return (
    <Card style={styles.card}>
      <Pressable onPress={onPress} disabled={!onPress}>
        <View style={styles.row}>
          {hasProductImage ? (
            <Image
              source={{ uri: item.imgProd as string }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.noImage]}>
              <Text style={styles.noImageText}>{t("noImage") ?? "Sin imagen"}</Text>
            </View>
          )}

          <View style={styles.info}>
            <TranslatedText text={item.categoria ?? ""} style={styles.category} />
            <TranslatedText text={item.marca ?? ""} style={styles.brand} />
            <TranslatedText text={item.detalle ?? ""} numberOfLines={2} style={styles.name} />

            <View style={styles.sealRow}>
              {hasSealLogo && (
                <Image
                  source={{ uri: item.logoSello as string }}
                  style={styles.sealLogo}
                  resizeMode="contain"
                />
              )}
              {item.sello ? (
                <View style={styles.sealPill}>
                  <TranslatedText text={item.sello ?? ""} style={styles.sealText} />
                </View>
              ) : null}
              {hasGfLogo && (
                <Image
                  source={{ uri: item.logoGf as string }}
                  style={styles.gfLogo}
                  resizeMode="contain"
                />
              )}
            </View>

            {item.certifica ? (
              <Text style={styles.meta} numberOfLines={2}>
                {t("certifiesLabel") ?? "Certifica"}: <TranslatedText text={item.certifica ?? ""} />
              </Text>
            ) : null}
            {item.gf ? (
              <Text style={styles.meta} numberOfLines={2}>
                GF: <TranslatedText text={item.gf ?? ""} />
              </Text>
            ) : null}
            {item.tienda ? (
              <Text style={styles.meta}>{t("storeLabel") ?? "Tienda"}: <TranslatedText text={item.tienda ?? ""} /></Text>
            ) : null}
            {item.pesaj ? (
              <Text style={styles.price}>₡ {item.pesaj}</Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      <Button
        title={saved ? (t("removeFromFavorites") ?? "Quitar de favoritos") : (t("saveProduct") ?? "Guardar producto")}
        onPress={onToggle}
        disabled={disabled}
        variant={saved ? "outline" : "primary"}
        size="sm"
        style={styles.saveBtn}
      />
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 10,
  },
  row: {
    flexDirection: "row",
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    marginRight: 10,
  },
  noImage: {
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  info: {
    flex: 1,
  },
  category: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  brand: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  name: {
    fontSize: 13,
    color: "#111827",
    marginTop: 2,
  },
  sealRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  sealLogo: {
    width: 22,
    height: 22,
    marginRight: 6,
  },
  gfLogo: {
    width: 22,
    height: 22,
    marginLeft: 6,
  },
  sealPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },
  sealText: {
    fontSize: 11,
    color: "#4C1D95",
    fontWeight: "600",
  },
  meta: {
    fontSize: 11,
    color: "#4B5563",
  },
  price: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  saveBtn: {
    marginTop: 8,
    alignSelf: "stretch",
  },
});

export default ProductCard;
