import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "outline" | "ghost";
  tone?: "default" | "danger";
  size?: "md" | "sm";
  disabled?: boolean;
  style?: ViewStyle;
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  tone = "default",
  size = "md",
  disabled,
  style,
}: Props) {
  const { palette, radius, space } = useTheme();

  const padV = size === "sm" ? space.xs + 4 : space.sm + 4;
  const padH = size === "sm" ? space.md : space.lg;

  const bg =
    variant === "primary"
      ? tone === "danger"
        ? palette.danger
        : palette.primary
      : "transparent";

  const borderColor =
    tone === "danger" ? "#F87171" /* rojo claro */ : palette.border;

  const txt =
    variant === "primary"
      ? palette.primaryText
      : tone === "danger"
      ? "#DC2626"
      : palette.text;

  const styles = StyleSheet.create({
    btn: {
      borderRadius: radius.md,
      minHeight: size === "sm" ? 40 : 48,
      paddingVertical: padV,
      paddingHorizontal: padH,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: variant === "outline" ? 1 : 0,
      backgroundColor: bg,
      borderColor,
      opacity: disabled ? 0.5 : 1,
    },
    text: {
      color: txt,
      fontWeight: "700",
      fontSize: size === "sm" ? 13 : 15,
      lineHeight: size === "sm" ? 17 : 20,
      textAlign: "center",
      flexShrink: 1,
    },
  });

  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.btn, style]}>
      <Text style={styles.text} numberOfLines={2} adjustsFontSizeToFit>{title}</Text>
    </Pressable>
  );
}
