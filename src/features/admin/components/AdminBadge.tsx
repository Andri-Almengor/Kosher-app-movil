import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { adminToneMap, type AdminTone } from "@/features/admin/design/adminTokens";

type Props = { label: string; tone?: AdminTone };

export default function AdminBadge({ label, tone = "slate" }: Props) {
  const colors = adminToneMap[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text numberOfLines={1} style={[styles.text, { color: colors.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  text: { fontSize: 11, fontWeight: "900" },
});
