import React, { useRef } from "react";
import { View, StyleSheet, Pressable, Image, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  title?: string;
};

export const AppHeader = React.memo(function AppHeader({ title }: Props) {
  const { t } = useI18n();
  const { palette: c } = useTheme();
  const insets = useSafeAreaInsets();

  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const timer = useRef<any>(null);

  const startSecretLogin = () => {
    timer.current = setTimeout(() => {
      navigation.navigate("AdminAuth");
    }, 5000);
  };

  const cancelSecretLogin = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.card, borderBottomColor: c.border, paddingTop: insets.top + 2 }]}>
      <Pressable
        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        style={styles.iconBtn}
        hitSlop={12}
      >
        <Ionicons name="menu" size={26} color={c.text} />
      </Pressable>

      <View style={styles.centerWrap}>
        <Pressable
          onPressIn={startSecretLogin}
          onPressOut={cancelSecretLogin}
          style={styles.logoWrap}
        >
          <Image source={require("../../assets/icon.png")} style={[styles.logo, width < 360 ? styles.logoSmall : null]} />
        </Pressable>
      </View>

      <View style={{ width: 38 }} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0.2,
    paddingBottom: 0.1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
  },
  iconBtn: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoWrap: { minWidth: 44, height: 20, justifyContent: "center", alignItems: "center" },
  logo: { width: 196, height: 92, borderRadius: 10, resizeMode: "contain" },
  logoSmall: { width: 136, height: 54 },
});
