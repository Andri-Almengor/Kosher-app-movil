import React, { useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, Linking, Alert, Image } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { SearchBar } from "@/components/SearchBar";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { AppFonts } from "@/theme/fonts";
import { syncAllIfOnline } from "@/offline/sync";
import { subscribeTabReset } from "@/lib/ui/tabReset";

const DONATION_LINKS: Record<number, string> = {
  18: "https://www.fygaro.com/en/pb/69843596-c50a-41be-ade5-7be1e98802f3/",
  36: "https://www.fygaro.com/en/pb/89f07cab-8cc6-4e39-964e-c24848e7f9a6/",
  54: "https://www.fygaro.com/en/pb/2ee11f9c-e9d8-4654-8245-806be5abeba4/",
  72: "https://www.fygaro.com/en/pb/c893e284-e3e7-494e-bcb6-d0f75eb05c16/",
};

const CUSTOM_DONATION_LINK = "https://www.fygaro.com/en/pb/80ccf690-d93e-48cd-a283-139ae7e3fa27/";
const AMIGOS_LOGO = require("../../../assets/amigos-of-costa-rica.png");
const AMOUNTS = [18, 36, 54, 72];

export function DonacionesScreen() {
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const { palette: c } = useTheme();
  const [selected, setSelected] = useState<number | null>(18);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");

  const amountButtons = useMemo(() => AMOUNTS, []);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await syncAllIfOnline(() => {});
    } finally {
      setRefreshing(false);
    }
  }, []);

  const openLink = React.useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error("unsupported");
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("error"), t("donationOpenError") ?? "No se pudo abrir el enlace de donación.");
    }
  }, [t]);

  const handleAmountPress = React.useCallback(async (amount: number) => {
    setSelected(amount);
    const url = DONATION_LINKS[amount];
    if (url) await openLink(url);
  }, [openLink]);

  const handleCustomAmount = React.useCallback(async () => {
    await openLink(CUSTOM_DONATION_LINK);
  }, [openLink]);


  React.useEffect(() => {
    return subscribeTabReset((tab) => {
      if (tab !== "Donaciones") setQ("");
    });
  }, []);

  const handleSubmitSearch = React.useCallback(() => {
    const query = q.trim();
    navigation.navigate("Productos", { screen: "ProductosHome", params: { initialQuery: query, resetKey: Date.now() } });
  }, [navigation, q]);

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <AppHeader />

      {/* Same search bar as Productos */}
      <View style={[styles.searchWrap, { backgroundColor: c.primary }]}>
        <SearchBar
          value={q}
          onChangeText={setQ}
          placeholder={t("searchPlaceholder")}
          variant="onPrimary"
          onSubmitEditing={handleSubmitSearch}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={[styles.titleSmall, { color: c.primary }]}>{t("donateCtaTitle")}</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>{t("donateCtaBody")}</Text>

        <Text style={[styles.titleBig, { color: c.primary }]}>{t("donateNow")}</Text>

        <View style={styles.amountCol}>
          {amountButtons.map((a) => {
            const active = selected === a;
            return (
              <Pressable
                key={a}
                onPress={() => { void handleAmountPress(a); }}
                style={[
                  styles.amountBtn,
                  { borderColor: c.border, backgroundColor: c.card },
                  active && { borderColor: c.primary },
                ]}
              >
                <Text style={[styles.amountText, { color: c.text }]}>${a}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.orRow}>
          <View style={[styles.orLine, { backgroundColor: c.border }]} />
          <Text style={[styles.orText, { color: c.muted }]}>o</Text>
          <View style={[styles.orLine, { backgroundColor: c.border }]} />
        </View>

        <Pressable style={[styles.chooseBtn, { borderColor: c.border, backgroundColor: c.card }]} onPress={() => { void handleCustomAmount(); }}>
          <Text style={[styles.chooseText, { color: c.text }]}>{t("chooseAmount")}</Text>
        </Pressable>

        <View style={styles.orRow}>
          <View style={[styles.orLine, { backgroundColor: c.border }]} />
          <Text style={[styles.orText, { color: c.muted }]}>o</Text>
          <View style={[styles.orLine, { backgroundColor: c.border }]} />
        </View>

        <View style={styles.amigosInfoRow}>
          <Text style={[styles.amigosInfoText, { color: c.text }]}>{t("amigosTaxDeductible")}</Text>
          <Image source={AMIGOS_LOGO} style={styles.amigosInfoLogo} resizeMode="contain" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },

  content: { flexGrow: 1, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 140, alignItems: "center" },
  titleSmall: { fontSize: 16, fontFamily: AppFonts.poppinsSemiBold, textAlign: "center", fontWeight: "800", letterSpacing: 0.2},
  subtitle: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 12,
    fontFamily: AppFonts.poppinsRegular,
    lineHeight: 16,
  },
  titleBig: { marginTop: 18, fontSize: 42, fontFamily: AppFonts.poppinsSemiBold, textAlign: "center", fontWeight: "800", letterSpacing: 0.2},

  amountCol: { width: "100%", marginTop: 18, gap: 12 },
  amountBtn: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: "center",
  },
  amountText: { fontSize: 22, fontFamily: AppFonts.poppinsMediumItalic },

  orRow: { marginTop: 18, width: "100%", flexDirection: "row", alignItems: "center" },
  orLine: { flex: 1, height: 2, borderRadius: 999 },
  orText: { paddingHorizontal: 14, fontFamily: AppFonts.poppinsRegular, textTransform: "lowercase" },

  chooseBtn: {
    marginTop: 18,
    width: "100%",
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: "center",
  },
  chooseText: { fontSize: 18, fontFamily: AppFonts.poppinsMediumItalic },

  amigosBtn: {
    marginTop: 18,
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  amigosIcon: { width: 34, height: 34, marginRight: 12 },
  amigosText: { flex: 1, fontSize: 18, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
  amigosArrow: { fontSize: 42, lineHeight: 42, fontFamily: AppFonts.poppinsRegular },

  amigosInfoRow: {
    width: "100%",
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d7dce4",
    flexDirection: "row",
    alignItems: "center",
  },
  amigosInfoText: { flex: 1, fontSize: 16, lineHeight: 22, fontFamily: AppFonts.poppinsRegular, paddingRight: 12 },
  amigosInfoLogo: { width: 150, height: 58 },
});

export default DonacionesScreen;
