import React from "react";
import { Image, View, StyleSheet } from "react-native";
import { useCachedUri } from "@/hooks/useCachedUri";

type Props = {
  uri?: string | null;
  style?: any;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
};

export const CachedImage = React.memo(function CachedImage({
  uri,
  style,
  resizeMode = "cover",
}: Props) {
  const src = useCachedUri(uri);

  if (!src) {
    return <View style={[styles.placeholder, style]} />;
  }

  return <Image source={{ uri: src }} style={style} resizeMode={resizeMode} fadeDuration={0} />;
});

const styles = StyleSheet.create({
  placeholder: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#d9d9d9",
  },
});

export default CachedImage;