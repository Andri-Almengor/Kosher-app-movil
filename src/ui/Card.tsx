import { View, StyleSheet, ViewProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export default function Card({ style, ...rest }: ViewProps) {
  const { palette, radius, shadow } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: palette.card,
          borderRadius: radius.md,
          ...shadow.card
        },
        style
      ]}
    />
  );
}
