import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AdminColors } from "./AdminStyles";

type Props = {
  title: string;
  // ⚠️ Se mantiene por compatibilidad, pero el usuario NO puede refrescar manualmente.
  onRefresh?: () => void;
  rightLabel?: string;
};

export function AdminHeader({ title }: Props) {
  return (
    <View style={styles.topBar}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AdminColors.bg,
  },
  title: { fontSize: 18, fontWeight: "900", color: AdminColors.text },
});
