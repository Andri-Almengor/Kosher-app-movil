import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CachedImage } from "@/components/CachedImage";
import { AppFonts } from "@/theme/fonts";

type PreviewPayload = {
  ownerId: string;
  uri: string;
  title?: string | null;
};

type ProductHoldPreviewContextValue = {
  showProductPreview: (payload: PreviewPayload) => void;
  hideProductPreview: (ownerId?: string) => void;
};

const ProductHoldPreviewContext = createContext<ProductHoldPreviewContextValue | null>(null);

export function ProductHoldPreviewProvider({ children }: React.PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [preview, setPreview] = useState<PreviewPayload | null>(null);

  const showProductPreview = useCallback((payload: PreviewPayload) => {
    const ownerId = String(payload?.ownerId ?? "").trim();
    const uri = String(payload?.uri ?? "").trim();
    if (!ownerId || !uri) return;

    setPreview({ ownerId, uri, title: payload.title ?? null });
  }, []);

  const hideProductPreview = useCallback((ownerId?: string) => {
    setPreview((current) => {
      if (!current) return null;
      if (ownerId && current.ownerId !== ownerId) return current;
      return null;
    });
  }, []);

  const value = useMemo(
    () => ({ showProductPreview, hideProductPreview }),
    [showProductPreview, hideProductPreview]
  );

  const overlay = preview ? (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.overlay,
        {
          paddingTop: Math.max(insets.top, 18) + 18,
          paddingBottom: Math.max(insets.bottom, 18) + 18,
        },
      ]}
    >
      <View style={styles.previewCard}>
        <CachedImage uri={preview.uri} style={styles.image} resizeMode="contain" />
        {!!preview.title && (
          <Text numberOfLines={2} style={styles.title}>
            {preview.title}
          </Text>
        )}
        <Text style={styles.helper}>Suelta la tarjeta para cerrar</Text>
      </View>
    </View>
  ) : null;

  return (
    <ProductHoldPreviewContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {preview && Platform.OS === "ios" ? (
          <FullWindowOverlay>{overlay}</FullWindowOverlay>
        ) : (
          overlay
        )}
      </View>
    </ProductHoldPreviewContext.Provider>
  );
}

export function useProductHoldPreview() {
  const context = useContext(ProductHoldPreviewContext);

  if (!context) {
    return {
      showProductPreview: (_payload: PreviewPayload) => {},
      hideProductPreview: (_ownerId?: string) => {},
    };
  }

  return context;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2147483647,
    elevation: 2147483647,
    backgroundColor: "rgba(0,0,0,0.94)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  previewCard: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "88%",
    borderRadius: 24,
    padding: 14,
    backgroundColor: "rgba(17,24,39,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 430,
    maxHeight: "76%",
    borderRadius: 18,
    backgroundColor: "#ffffff",
  },
  title: {
    marginTop: 13,
    color: "#ffffff",
    textAlign: "center",
    fontSize: 17,
    lineHeight: 22,
    fontFamily: AppFonts.poppinsSemiBold,
    fontWeight: "800",
  },
  helper: {
    marginTop: 6,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    fontSize: 12,
    fontFamily: AppFonts.poppinsRegular,
  },
});
