import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AppHeader } from "@/components/AppHeader";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { AppFonts } from "@/theme/fonts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CachedImage } from "@/components/CachedImage";
import { useOfflineList } from "@/offline/useOfflineList";
import type { Restaurant } from "@/features/restaurants/api/restaurantsApi";
import { localizeRestaurant } from "@/features/restaurants/utils/localizeRestaurant";
import FullscreenImageModal from "@/components/FullscreenImageModal";

function normalizePhone(value?: string | null) {
  return String(value ?? "").trim().replace(/[^\d+]/g, "");
}

function normalizeWhatsApp(value?: string | null) {
  return String(value ?? "").trim().replace(/[^\d]/g, "");
}

function normalizeEmail(value?: string | null) {
  return String(value ?? "").trim();
}

export function RestauranteDetalleScreen() {
  const { t, lang } = useI18n();
  const { palette: c } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [imageOpen, setImageOpen] = useState(false);

  const restauranteId = route.params?.restauranteId;
  const { items = [] } = useOfflineList<Restaurant>("restaurantes");

  const data = useMemo(() => {
    const id = String(restauranteId ?? "");
    const raw =
      (items ?? []).find(
        (x: any) => String(x?.id) === id && x?.activo !== false
      ) ?? null;

    return raw ? localizeRestaurant(raw as Restaurant, lang) : null;
  }, [items, restauranteId, lang]);

  const chips = [data?.tipo, data?.ubicacion].filter(Boolean) as string[];
  const chipStyles = [styles.chipCommerce, styles.chipLocation];

  const phone = normalizePhone(data?.telefono ?? data?.telefonoRaw ?? null);
  const whatsapp = normalizeWhatsApp(data?.whatsapp ?? data?.whatsappRaw ?? null);
  const email = normalizeEmail(data?.correo ?? data?.correoRaw ?? null);

  const goToRestaurantsHome = () => {
    try {
      navigation.navigate("Restaurantes", {
        screen: "RestaurantesHome",
        params: { resetKey: Date.now() },
      });
    } catch {
      try {
        navigation.goBack();
      } catch {}
    }
  };

  const openUrl = async (url?: string | null) => {
    const target = String(url ?? "").trim();
    if (!target) return;
    try {
      const canOpen = await Linking.canOpenURL(target);
      if (canOpen) await Linking.openURL(target);
    } catch {}
  };

  const openPhone = async () => openUrl(phone ? `tel:${phone}` : null);
  const openWhatsApp = async () => {
    if (!whatsapp) return;
    const waUrl = `https://wa.me/${whatsapp}`;
    await openUrl(waUrl);
  };
  const openEmail = async () => openUrl(email ? `mailto:${email}` : null);
  const openMap = async () => openUrl(data?.direccionLink || "");

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <AppHeader />
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: c.muted }]}>
            {lang === "en"
              ? "This business is not available."
              : "Este comercio no está disponible."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroWrap}>
          {data?.imageUrl ? (
            <Pressable
              onPress={() => setImageOpen(true)}
              style={styles.heroImagePressable}
              accessibilityRole="button"
              accessibilityLabel="Ver imagen completa"
            >
              <CachedImage uri={data.imageUrl} style={styles.heroImage} resizeMode="cover" />
              <View style={styles.expandBadge}>
                <Ionicons name="expand-outline" size={16} color="#fff" />
                <Text style={styles.expandBadgeTxt}>Ver completa</Text>
              </View>
            </Pressable>
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder, { backgroundColor: c.border }]}>
              <Text style={[styles.heroPlaceholderText, { color: c.muted }]}>
                {lang === "en"
                  ? "This business does not have an image"
                  : "Este comercio no cuenta con una imagen"}
              </Text>
            </View>
          )}

          <Pressable onPress={goToRestaurantsHome} hitSlop={12} style={[styles.backBtn, { backgroundColor: c.card }]}> 
            <Ionicons name="arrow-back" size={26} color={c.text} />
          </Pressable>
        </View>

        <View style={[styles.overlayCard, { backgroundColor: c.card, borderColor: c.border }]}> 
          <Text style={[styles.name, { color: c.text }]}>{data.nombre || t("untitled")}</Text>
          <Text style={[styles.type, { color: c.muted }]}>{data.tipo || t("na")}</Text>

          <View style={styles.badgesRow}>
            {chips.map((chip, index) => (
              <View key={`${chip}-${index}`} style={[styles.chip, chipStyles[index] ?? styles.chipCommerce]}>
                <Text style={styles.chipText}>{chip}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.contentWrap}>
          <Section title={t("productInfo")} c={c}>
            <Info label={t("labelCategory")} value={data.tipo} c={c} />
            <Info label={t("locationLabel")} value={data.ubicacion} c={c} />
          </Section>

          <Section title={t("detail")} c={c}>
            <Text style={[styles.value, { color: c.muted }]}>{data.acercaDe || t("na")}</Text>
          </Section>

          <Section title={t("businessHours")} c={c}>
            <Text style={[styles.value, { color: c.muted }]}>{data.horario || t("na")}</Text>
          </Section>

          <Section title={t("contactMethods")} c={c}>
            {!!phone && (
              <ContactActionCard
                c={c}
                icon="call-outline"
                label={t("phone")}
                value={phone}
                description={data.telefonoDescripcion}
                actionLabel={t("callNow")}
                onPress={openPhone}
              />
            )}

            {!!whatsapp && (
              <ContactActionCard
                c={c}
                icon="logo-whatsapp"
                label={t("whatsapp")}
                value={whatsapp}
                description={data.whatsappDescripcion}
                actionLabel={t("openWhatsApp")}
                onPress={openWhatsApp}
              />
            )}

            {!!email && (
              <ContactActionCard
                c={c}
                icon="mail-outline"
                label={t("email")}
                value={email}
                description={data.correoDescripcion}
                actionLabel={t("sendEmail")}
                onPress={openEmail}
              />
            )}

            {!phone && !whatsapp && !email && (
              <Text style={[styles.value, { color: c.muted }]}>{t("na")}</Text>
            )}
          </Section>

          <Section title={t("address")} c={c}>
            <Text style={[styles.value, { color: c.muted }]}>{data.direccion || t("na")}</Text>

            {!!data?.direccionLink && (
              <Pressable onPress={openMap} style={[styles.actionBtn, { backgroundColor: c.primary }]}>
                <Text style={[styles.actionText, { color: c.primaryText }]}>{t("openInMaps")}</Text>
              </Pressable>
            )}
          </Section>

          <Section title={t("news")} c={c}>
            <Pressable
              onPress={() =>
                navigation.navigate("Novedades", {
                  screen: "NovedadesHome",
                  params: {
                    mode: "ANUNCIANTES",
                    restaurantId: data?.id ?? null,
                    fromRestaurant: true,
                  },
                })
              }
              style={[styles.linkCard, { backgroundColor: c.card, borderColor: c.border }]}
            >
              <Text style={[styles.linkText, { color: c.text }]}>
                {lang === "en" ? "View related announcements" : "Ver anuncios relacionados"}
              </Text>
            </Pressable>
          </Section>
        </View>
      </ScrollView>

      <FullscreenImageModal
        visible={imageOpen}
        uri={data?.imageUrl}
        title={data?.nombre || null}
        onClose={() => setImageOpen(false)}
      />
    </View>
  );
}

function Section({ title, children, c }: any) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Info({ label, value, c }: any) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      <Text style={[styles.value, { color: c.muted }]}>{value || "N/A"}</Text>
    </View>
  );
}

function ContactActionCard({ c, icon, label, value, description, actionLabel, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={[styles.contactCard, { borderColor: c.border, backgroundColor: c.card }]}>
      <View style={styles.contactHeader}>
        <Ionicons name={icon} size={18} color={c.primary} />
        <Text style={[styles.label, { color: c.text, marginBottom: 0, flex: 1 }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: c.text }]}>{value}</Text>
      {!!description && <Text style={[styles.contactDescription, { color: c.muted }]}>{description}</Text>}
      <Text style={[styles.callNow, { color: c.primary }]}>{actionLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 120 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { textAlign: "center", fontFamily: AppFonts.poppinsRegular, fontSize: 19, lineHeight: 24 },
  heroWrap: { position: "relative" },
  heroImagePressable: { width: "100%", height: 220, position: "relative" },
  heroImage: { width: "100%", height: 220 },
  heroPlaceholder: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  heroPlaceholderText: { textAlign: "center", fontSize: 19, lineHeight: 22, fontFamily: AppFonts.poppinsRegular },
  backBtn: { position: "absolute", top: 16, left: 16, width: 56, height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center", elevation: 5, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  expandBadge: { position: "absolute", right: 14, bottom: 14, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(17,24,39,0.78)", borderWidth: 1, borderColor: "rgba(255,255,255,0.24)" },
  expandBadgeTxt: { color: "#fff", fontSize: 13, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
  overlayCard: { marginHorizontal: 16, marginTop: -28, borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 14, elevation: 4 },
  name: { fontSize: 25, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", lineHeight: 28 },
  type: { marginTop: 4, fontSize: 18, fontFamily: AppFonts.poppinsRegular, lineHeight: 22 },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipCommerce: { backgroundColor: "#7c3aed" },
  chipLocation: { backgroundColor: "#ea580c" },
  chipText: { color: "#fff", fontSize: 15, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
  contentWrap: { paddingHorizontal: 16, paddingTop: 10 },
  sectionWrap: { marginTop: 18 },
  sectionTitle: { fontSize: 19, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", marginBottom: 8 },
  row: { marginBottom: 10 },
  label: { fontSize: 17, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", lineHeight: 20 },
  value: { fontSize: 18, fontFamily: AppFonts.poppinsRegular, marginTop: 2, lineHeight: 22 },
  actionBtn: { marginTop: 12, alignSelf: "flex-start", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  actionText: { fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", fontSize: 17 },
  linkCard: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  linkText: { fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", fontSize: 17 },
  contactCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  contactHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactDescription: { marginTop: 6, fontSize: 16, lineHeight: 20, fontFamily: AppFonts.poppinsRegular },
  callNow: { marginTop: 8, fontSize: 16, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
});

export default RestauranteDetalleScreen;
