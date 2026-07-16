import { TextInput, StyleSheet, TextInputProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

export default function Input(props: TextInputProps) {
  const { palette, radius } = useTheme();
  return (
    <TextInput
      placeholderTextColor={palette.muted}
      {...props}
      style={[
        StyleSheet.create({
          input: {
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: radius.md,
            paddingHorizontal: 12,
            minHeight: 48,
            paddingVertical: 12,
            color: palette.text,
            backgroundColor: palette.bg
          }
        }).input,
        props.style
      ]}
    />
  );
}
