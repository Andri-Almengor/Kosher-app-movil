import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { AdminColors } from "./AdminStyles";

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
};

export function AdminCard({ children, onPress }: Props) {
  if (onPress) {
    return (
      <Pressable style={styles.card} onPress={onPress}>
        {children}
      </Pressable>
    );
  }
  return <View style={styles.card}>{children}</View>;
}

export function AdminCardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

export function AdminCardMeta({ children }: { children: React.ReactNode }) {
  return <Text style={styles.meta}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: 18,
    padding: 12,
    backgroundColor: AdminColors.bg,
  },
  cardTitle: { fontSize: 15, fontWeight: "900", color: AdminColors.text },
  meta: { marginTop: 6, fontSize: 12, color: AdminColors.muted },
});
