import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Alert,
  Image,
  Linking,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommonActions, DrawerActions } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../app/auth/authStore";
import { useI18n } from "../../i18n/I18nProvider";
import { AppFonts } from "../../theme/fonts";
import { AppIcon } from "../../components/AppIcon";

import {
  getOfflineImagesSummary,
  setOfflineImagesEnabled,
  warmProductImages,
  cancelOfflineWarmup,
} from "../../features/products/offlinePrefs";
import { useOfflineDownloadManager } from "../../lib/offline/DownloadManager";

type DrawerProps = {
  navigation: any;
};

export default function CustomDrawerContent(props: DrawerProps) {
  const { palette: c } = useTheme();
  const logout = useAuth((s: any) => s.logout);
  const user = useAuth((s: any) => s.user);
  const isAdmin = useAuth((s: any) => s.isAdmin());
  const { lang, setLang, t } = useI18n();

  const [changingLang, setChangingLang] = useState<null | "es" | "en">(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [offlineSummary, setOfflineSummary] = useState<any>(null);

  const lastContactTapRef = useRef(0);
  const contactSingleTapTimerRef = useRef<any>(null);

  const offlineDownloads = useOfflineDownloadManager();

  const refreshSummary = useCallback(async () => {
    try {
      const summary = await getOfflineImagesSummary();
      setOfflineSummary(summary);
    } catch {
      setOfflineSummary(null);
    }
  }, []);

  useEffect(() => {
    void refreshSummary();

    const unsubscribe = props?.navigation?.addListener?.("drawerOpen", () => {
      void refreshSummary();
    });

    return unsubscribe;
  }, [props?.navigation, refreshSummary]);

  const closeDrawer = useCallback(() => {
    props.navigation?.dispatch?.(DrawerActions.closeDrawer());
  }, [props.navigation]);

  const goHome = useCallback(() => {
    props.navigation?.dispatch?.(
      CommonActions.navigate({
        name: "Tabs",
        params: { screen: "Inicio" },
      })
    );
    closeDrawer();
  }, [props.navigation, closeDrawer]);

  const goAdmin = useCallback(() => {
    try {
      props.navigation?.navigate?.("Admin", {
        screen: "AdminHome",
        params: { resetKey: Date.now() },
      });
    } catch {
      props.navigation?.dispatch?.(
        CommonActions.navigate({
          name: "Admin",
          params: {
            screen: "AdminHome",
            params: { resetKey: Date.now() },
          },
        })
      );
    }

    closeDrawer();
  }, [props.navigation, closeDrawer]);

  const handleOfflineToggle = useCallback(async () => {
    const nextValue = !offlineSummary?.enabled;

    try {
      if (!nextValue) {
        await cancelOfflineWarmup();
        await setOfflineImagesEnabled(false);
        await refreshSummary();
        return;
      }

      await setOfflineImagesEnabled(true);

      Alert.alert(
        t("offlineImagesDownloadStartedTitle"),
        t("offlineImagesDownloadStartedBody")
      );

      await refreshSummary();
      void warmProductImages().finally(() => void refreshSummary());
    } catch {
      Alert.alert(
        t("errorTitle") || "Error",
        t("offlineImagesError") || "No se pudo actualizar el modo offline."
      );
    }
  }, [offlineSummary?.enabled, refreshSummary, t]);


  useEffect(() => {
    return () => {
      if (contactSingleTapTimerRef.current) {
        clearTimeout(contactSingleTapTimerRef.current);
      }
    };
  }, []);

  const openDrawerContactActions = useCallback(() => {
    const phoneRaw = "2520-1013";
    const phoneDisplay = `${phoneRaw} ext. 117`;
    const email = "certificacioneskosher@centroisraelita.com";

    Alert.alert(
      t("drawerContactQuickActionsTitle"),
      t("drawerContactQuickActionsBody"),
      [
        {
          text: t("drawerContactEmailAction"),
          onPress: () => {
            void Linking.openURL(`mailto:${email}`);
          },
        },
        {
          text: `${t("drawerContactCallAction")} ${phoneDisplay}`,
          onPress: () => {
            void Linking.openURL(`tel:${phoneRaw.replace(/[^\d+]/g, "")}`);
          },
        },
        { text: t("cancel"), style: "cancel" },
      ]
    );
  }, [t]);

  const toggleSection = useCallback((key: "contact" | "about") => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (key === "contact") setContactOpen((prev) => !prev);
    if (key === "about") setAboutOpen((prev) => !prev);
  }, []);

  const handleSectionPress = useCallback((key: "contact" | "about") => {
    if (key !== "contact") {
      toggleSection(key);
      return;
    }

    const now = Date.now();
    const delta = now - lastContactTapRef.current;
    lastContactTapRef.current = now;

    if (contactSingleTapTimerRef.current) {
      clearTimeout(contactSingleTapTimerRef.current);
      contactSingleTapTimerRef.current = null;
    }

    if (delta > 0 && delta < 280) {
      openDrawerContactActions();
      return;
    }

    contactSingleTapTimerRef.current = setTimeout(() => {
      toggleSection("contact");
      contactSingleTapTimerRef.current = null;
    }, 280);
  }, [openDrawerContactActions, toggleSection]);

  const handleChangeLanguage = useCallback(
    async (nextLang: "es" | "en") => {
      if (lang === nextLang || changingLang) return;

      setChangingLang(nextLang);
      try {
        await setLang(nextLang);
      } finally {
        setChangingLang(null);
      }
    },
    [changingLang, lang, setLang]
  );

  const sections = useMemo(
    () => [
      {
        key: "contact" as const,
        title: t("drawerContact"),
        body: t("drawerContactInfo"),
        open: contactOpen,
      },
      {
        key: "about" as const,
        title: t("drawerAboutUs"),
        body: t("drawerAboutInfo"),
        open: aboutOpen,
      },
    ],
    [aboutOpen, contactOpen, t]
  );

  const offlineDescription =
    offlineDownloads.progress.running > 0 || offlineDownloads.progress.queued > 0
      ? `${offlineDownloads.progress.completed}/${offlineDownloads.progress.total} • ${offlineDownloads.progress.percent}%`
      : offlineSummary?.enabled
      ? t("offlineImagesActiveSummary", {
          count: offlineSummary?.stats?.count ?? 0,
        })
      : t("offlineImagesDownloadPrompt");

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: c.bg }]}
      edges={["top", "bottom"]}
    >
      <DrawerContentScrollView
        {...props}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.topButtonsWrap}>
          <Pressable
            onPress={goHome}
            style={[styles.topSingleButton, { backgroundColor: c.primary }]}
          >
            <View style={styles.topIconCircle}>
              <AppIcon name="home" size={18} />
            </View>
          </Pressable>

          {isAdmin ? (
            <Pressable
              onPress={goAdmin}
              style={[styles.topSingleButton, { backgroundColor: c.primary }]}
            >
              <View style={styles.topIconCircle}>
                <Ionicons name="shield-checkmark" size={17} color="#111827" />
              </View>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.languageSection}>
          <View style={styles.languageHeaderRow}>
            <View style={styles.languageTextBlock}>
              <Text style={[styles.languageTitle, { color: c.text }]}>
                {t("languageLabel")}
              </Text>

              <Text style={[styles.languageSubtitle, { color: c.muted }]}>
                {t("languageFlagsHelp")}
              </Text>
            </View>

            <View style={styles.flagsInlineRow}>
              <Pressable
                onPress={() => void handleChangeLanguage("es")}
                style={[
                  styles.flagMiniCard,
                  {
                    backgroundColor: c.card,
                    borderColor: lang === "es" ? c.primary : c.border,
                    opacity: changingLang === "en" ? 0.75 : 1,
                  },
                ]}
              >
                <AppIcon name="espanol" size={28} />
                <Text style={[styles.flagMiniText, { color: c.text }]}>
                  Español
                </Text>
              </Pressable>

              <Pressable
                onPress={() => void handleChangeLanguage("en")}
                style={[
                  styles.flagMiniCard,
                  {
                    backgroundColor: c.card,
                    borderColor: lang === "en" ? c.primary : c.border,
                    opacity: changingLang === "es" ? 0.75 : 1,
                  },
                ]}
              >
                <AppIcon name="ingles" size={28} />
                <Text style={[styles.flagMiniText, { color: c.text }]}>
                  English
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.separator, { backgroundColor: c.border }]} />

        {sections.map((section) => (
          <View key={section.key}>
            <Pressable
              onPress={() => handleSectionPress(section.key)}
              hitSlop={6}
              style={styles.accordionHeader}
            >
              <Text style={[styles.accordionTitle, { color: c.text }]}>
                {section.title}
              </Text>

              <Ionicons
                name={section.open ? "chevron-up" : "chevron-down"}
                size={20}
                color={c.muted}
              />
            </Pressable>

            {section.open ? (
              <Pressable
                onPress={() => handleSectionPress(section.key)}
                hitSlop={6}
                style={styles.accordionBodyWrap}
              >
                <Text style={[styles.accordionBody, { color: c.muted }]}>
                  {section.body}
                </Text>
              </Pressable>
            ) : null}

            <View style={[styles.separator, { backgroundColor: c.border }]} />
          </View>
        ))}

        <Pressable
          onPress={handleOfflineToggle}
          style={[
            styles.offlineCard,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          <View style={styles.offlineTextWrap}>
            <Text style={[styles.offlineTitle, { color: c.text }]}>
              {t("offlineImagesLabel")}
            </Text>

            <Text style={[styles.offlineSubtitle, { color: c.muted }]}>
              {offlineDescription}
            </Text>
          </View>

          <View style={styles.offlineIconWrap}>
            <Ionicons
              name={
                offlineSummary?.enabled
                  ? "cloud-done-outline"
                  : "cloud-download-outline"
              }
              size={18}
              color={c.primary}
            />
          </View>
        </Pressable>

        <View style={styles.logoWrap}>
          <Image
            source={require("../../../assets/LOGO-CIS.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.donationText, { color: c.muted }]}>
            {t("drawerDonationText")}
          </Text>
        </View>
      </DrawerContentScrollView>

      {!!user ? (
        <View style={[styles.footer, { borderTopColor: c.border }]}>
          <Pressable
            onPress={logout}
            style={[
              styles.logoutButton,
              { backgroundColor: c.card, borderColor: c.border },
            ]}
          >
            <Ionicons name="log-out-outline" size={15} color={c.text} />
            <Text style={[styles.logoutText, { color: c.text }]}>
              {t("logout")}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 20,
    flexGrow: 1,
  },

  topButtonsWrap: {
    marginBottom: 14,
    gap: 10,
    alignItems: "flex-start",
  },

  topSingleButton: {
    width: "100%",
    height: 45,
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  topIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  languageSection: {
    marginBottom: 2,
  },

  languageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  languageTextBlock: {
    flex: 1,
    paddingRight: 4,
  },

  languageTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: AppFonts.poppinsSemiBold,
    fontWeight: "800",
  },

  languageSubtitle: {
    marginTop: 2,
    fontSize: 10.5,
    lineHeight: 14,
    fontFamily: AppFonts.poppinsRegular,
  },

  flagsInlineRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },

  flagMiniCard: {
    width: 86,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 68,
  },

  flagMiniText: {
    marginTop: 5,
    fontSize: 10,
    fontFamily: AppFonts.poppinsMediumItalic,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },

  accordionHeader: {
    minHeight: 58,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  accordionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: AppFonts.poppinsSemiBold,
    fontWeight: "800",
  },

  accordionBodyWrap: {
    paddingBottom: 14,
    paddingTop: 8,
    paddingRight: 8,
    width: "100%",
  },

  accordionBody: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: AppFonts.poppinsRegular,
  },

  offlineCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  offlineTextWrap: {
    flex: 1,
    paddingRight: 10,
  },

  offlineTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: AppFonts.poppinsSemiBold,
    fontWeight: "800",
  },

  offlineSubtitle: {
    marginTop: 2,
    fontSize: 10.5,
    lineHeight: 15,
    fontFamily: AppFonts.poppinsRegular,
  },

  offlineIconWrap: {
    width: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  logoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 24,
    paddingBottom: 18,
  },

  logo: {
    width: 205,
    height: 205,
  },

  donationText: {
    marginTop: -12,
    fontSize: 11.5,
    lineHeight: 15,
    textAlign: "center",
    fontFamily: AppFonts.poppinsRegular,
  },

  footer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
  },

  logoutButton: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  logoutText: {
    fontSize: 12,
    fontFamily: AppFonts.poppinsMediumItalic,
  },
});