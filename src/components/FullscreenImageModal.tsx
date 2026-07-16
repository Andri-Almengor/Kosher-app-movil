import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ImageViewing from "react-native-image-viewing";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppFonts } from "@/theme/fonts";

export type FullscreenImageModalProps = {
  visible: boolean;
  uri?: string | null;
  title?: string | null;
  onClose: () => void;
};

export function FullscreenImageModal({ visible, uri, title, onClose }: FullscreenImageModalProps) {
  const insets = useSafeAreaInsets();

  const images = useMemo(() => (uri ? [{ uri }] : []), [uri]);

  const HeaderComponent = () => (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
      <View style={styles.titleWrap} pointerEvents="none">
        {!!title && (
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        )}
        <Text style={styles.subtitle}>Pellizca para acercar</Text>
      </View>

      <Pressable
        onPress={onClose}
        style={styles.closeBtn}
        hitSlop={14}
        accessibilityRole="button"
        accessibilityLabel="Cerrar imagen"
      >
        <Ionicons name="close" size={31} color="#fff" />
      </Pressable>
    </View>
  );

  const FooterComponent = () => (
    <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]} pointerEvents="none">
      <Text style={styles.helper}>Doble toque para acercar o alejar</Text>
    </View>
  );

  if (!uri) return null;

  return (
    <ImageViewing
      images={images}
      imageIndex={0}
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      backgroundColor="rgba(0,0,0,0.96)"
      swipeToCloseEnabled
      doubleTapToZoomEnabled
      HeaderComponent={HeaderComponent}
      FooterComponent={FooterComponent}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  titleWrap: { flex: 1, paddingRight: 12 },
  title: {
    color: "#fff",
    fontSize: 16,
    fontFamily: AppFonts.poppinsSemiBold,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontFamily: AppFonts.poppinsRegular,
  },
  closeBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,17,17,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  helper: {
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    fontSize: 13,
    fontFamily: AppFonts.poppinsRegular,
  },
});

export default FullscreenImageModal;
