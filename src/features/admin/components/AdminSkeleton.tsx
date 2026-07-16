import React from "react";
import { StyleSheet, View } from "react-native";

type Props = { rows?: number; borderColor?: string; cardColor?: string };

export default function AdminSkeleton({ rows = 6, borderColor = "#e2e8f0", cardColor = "#ffffff" }: Props) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={[styles.card, { borderColor, backgroundColor: cardColor }]}>
          <View style={styles.avatar} />
          <View style={styles.lines}>
            <View style={[styles.line, { width: "72%" }]} />
            <View style={[styles.line, styles.smallLine, { width: "48%" }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 10 },
  card: { borderWidth: 1, borderRadius: 22, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#e2e8f0" },
  lines: { flex: 1, gap: 8 },
  line: { height: 14, borderRadius: 999, backgroundColor: "#e2e8f0" },
  smallLine: { height: 11, opacity: 0.8 },
});
