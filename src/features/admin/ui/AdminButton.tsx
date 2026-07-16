import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AdminColors } from "./AdminStyles";

type Props = {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  variant?: "primary" | "ghost" | "danger";
  style?: ViewStyle;
};

export function AdminButton({ label, onPress, icon, variant = "primary", style }: Props) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";

  return (
    <Pressable
      style={[
        styles.base,
        isPrimary && styles.primary,
        isDanger && styles.danger,
        variant === "ghost" && styles.ghost,
        style,
      ]}
      onPress={onPress}
    >
      {!!icon && (
        <Ionicons
          name={icon}
          size={16}
          color={isPrimary || isDanger ? AdminColors.primaryText : AdminColors.text}
        />
      )}
      <Text
        style={[
          styles.txt,
          (isPrimary || isDanger) && { color: AdminColors.primaryText },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primary: { backgroundColor: AdminColors.primary },
  danger: { backgroundColor: "#dc2626" },
  ghost: { borderWidth: 1, borderColor: AdminColors.border, backgroundColor: AdminColors.bg },
  txt: { fontWeight: "900", color: AdminColors.text },
});
