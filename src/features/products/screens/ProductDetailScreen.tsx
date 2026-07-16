// src/features/products/screens/ProductDetailScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useI18n } from "@/i18n/I18nProvider";
import { TranslatedText } from "@/components/TranslatedText";
import { Product } from "../api/types";
import { isHttpUrl } from "../../../utils/format";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FullscreenImageModal from "@/components/FullscreenImageModal";

type RouteParams = {
  product: Product;
};

export default function ProductDetailScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [imageOpen, setImageOpen] = useState(false);
  const route = useRoute<any>();
  const product = route.params?.product as Product | undefined;

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.meta}>No se pudo cargar el producto.</Text>
      </View>
    );
  }

  const hasMainImage = isHttpUrl(product.imgProd ?? undefined);
  const hasSealLogo = isHttpUrl(product.logoSello ?? undefined);
  const hasGfLogo = isHttpUrl(product.logoGf ?? undefined);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Imagen principal */}
      <View style={styles.imageWrapper}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t("back") ?? "Volver"}
        >
          <Ionicons name="arrow-back" size={26} color="#111827" />
        </Pressable>
        {hasMainImage ? (
          <Pressable
            onPress={() => setImageOpen(true)}
            style={styles.imagePressable}
            accessibilityRole="button"
            accessibilityLabel="Ver imagen completa"
          >
            <Image
              source={{ uri: product.imgProd as string }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={[styles.expandBadge, { bottom: Math.max(12, insets.bottom + 8) }]}>
              <Ionicons name="expand-outline" size={16} color="#fff" />
              <Text style={styles.expandBadgeTxt}>Ver completa</Text>
            </View>
          </Pressable>
        ) : (
          <View style={[styles.image, styles.noImage]}>
            <Text style={styles.noImageText}>{t("noImage") ?? "Sin imagen"}</Text>
          </View>
        )}
      </View>

      {/* Marca / Nombre */}
      <View style={styles.header}>
        {product.categoria ? (
          <TranslatedText text={product.categoria} style={styles.category} />
        ) : null}
        {product.marca ? (
          <TranslatedText text={product.marca} style={styles.brand} />
        ) : null}
        {product.detalle ? (
          <TranslatedText text={product.detalle} style={styles.title} />
        ) : null}
      </View>

      {/* Sello + logos */}
      {(product.sello ||
        hasSealLogo ||
        hasGfLogo ||
        product.certifica ||
        product.pol) && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t("sealAndCertification") ?? "Sello y certificación"}</Text>

          <View style={styles.sealRow}>
            {hasSealLogo && (
              <Image
                source={{ uri: product.logoSello as string }}
                style={styles.sealLogo}
                resizeMode="contain"
              />
            )}
            {product.sello ? (
              <View style={styles.sealPill}>
                <TranslatedText text={product.sello ?? ""} style={styles.sealText} />
              </View>
            ) : null}
            {hasGfLogo && (
              <Image
                source={{ uri: product.logoGf as string }}
                style={styles.gfLogo}
                resizeMode="contain"
              />
            )}
          </View>

          {product.certifica ? (
            <Text style={styles.meta}>
              <Text style={styles.label}>{t("certifiesLabel") ?? "Certifica"}: </Text>
              <TranslatedText text={product.certifica ?? ""} />
            </Text>
          ) : null}

          {product.pol ? (
            <Text style={styles.meta}>
              <Text style={styles.label}>{t("policyLawLabel") ?? "Política / ley"}: </Text>
              <TranslatedText text={product.pol ?? ""} maxLen={400} />
            </Text>
          ) : null}
        </View>
      )}

      {/* Info GF / tienda / precio */}
      {(product.gf || product.tienda || product.pesaj) && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t("productInfo") ?? "Información del producto"}</Text>

          {product.gf ? (
            <Text style={styles.meta}>
              <Text style={styles.label}>GF: </Text>
              <TranslatedText text={product.gf ?? ""} />
            </Text>
          ) : null}
          {product.tienda ? (
            <Text style={styles.meta}>
              <Text style={styles.label}>{t("storeLabel") ?? "Tienda"}: </Text>
              <TranslatedText text={product.tienda ?? ""} />
            </Text>
          ) : null}
          {product.pesaj && (
            <Text style={styles.meta}>
              <Text style={styles.label}>{t("priceLabel") ?? "Precio / pesaj"}: </Text>
              {product.pesaj}
            </Text>
          )}
        </View>
      )}
      <FullscreenImageModal
        visible={imageOpen}
        uri={product.imgProd as string}
        title={product.detalle ?? product.marca ?? "Imagen del producto"}
        onClose={() => setImageOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  imageWrapper: {
    width: "100%",
    height: 260,
    backgroundColor: "#f4f4f5",
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  imagePressable: {
    flex: 1,
  },
  image: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  expandBadge: {
    position: "absolute",
    right: 14,
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(17,24,39,0.86)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  expandBadgeTxt: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  noImage: {
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    color: "#9ca3af",
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  category: {
    fontSize: 16,
    color: "#6b7280",
  },
  brand: {
    fontSize: 21,
    fontWeight: "700",
    color: "#111827",
  },
  title: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: "600",
    color: "#111827",
  },
  block: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
  },
  blockTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  sealRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    columnGap: 8,
  },
  sealLogo: {
    width: 32,
    height: 32,
  },
  gfLogo: {
    width: 32,
    height: 32,
  },
  sealPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#eef2ff",
  },
  sealText: {
    fontSize: 15,
    color: "#4c1d95",
    fontWeight: "600",
  },
  label: {
    fontWeight: "600",
    color: "#111827",
  },
  meta: {
    fontSize: 17,
    color: "#374151",
    marginTop: 4,
  },
});
