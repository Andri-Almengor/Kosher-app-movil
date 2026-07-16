import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AppHeader } from "@/components/AppHeader";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { AppFonts } from "@/theme/fonts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CachedImage } from "@/components/CachedImage";
import { FullscreenImageModal } from "@/components/FullscreenImageModal";
import { useOfflineList } from "@/offline/useOfflineList";
import { openAssetUrl } from "@/lib/openAsset";
import { localizeRestaurant, localizeRestaurantName } from "@/features/restaurants/utils/localizeRestaurant";

type NewsItem = {
  id: number;
  titulo?: string | null;
  contenido?: string | null;
  imageUrl?: string | null;
  fileUrl?: string | null;
  destino?: "NOVEDADES" | "ANUNCIANTES";
  restaurante?: { id: number; nombre?: string | null; nombreEs?: string | null; nombreEn?: string | null } | null;
  restauranteId?: number | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
  activo?: boolean;
};

function safeDateLabel(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function NovedadDetalleScreen() {
  const { t, lang } = useI18n();
  const { palette: c } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const newsId = route.params?.newsId;
  const { items = [] } = useOfflineList<NewsItem>("noticias");
  const { items: restaurantItems = [] } = useOfflineList<any>("restaurantes");

  const visibleRestaurantIds = useMemo(() => {
    return new Set(
      (restaurantItems ?? [])
        .filter((item: any) => item?.activo !== false)
        .map((item: any) => Number(item?.id))
        .filter((id) => Number.isFinite(id))
    );
  }, [restaurantItems]);

  const data = useMemo(() => {
    const id = String(newsId ?? "");
    return (items ?? []).find((x: any) => {
      if (String(x?.id) !== id) return false;
      if (x?.activo === false) return false;
      const rawRestaurantId = x?.restauranteId ?? x?.restaurante?.id;
      if (rawRestaurantId == null) return true;
      const parsedRestaurantId = Number(rawRestaurantId);
      if (!Number.isFinite(parsedRestaurantId)) return true;
      return visibleRestaurantIds.has(parsedRestaurantId);
    }) ?? null;
  }, [items, newsId, visibleRestaurantIds]);

  const relatedRestaurant = useMemo(() => {
    const restaurantId = Number(data?.restauranteId ?? data?.restaurante?.id);
    if (!Number.isFinite(restaurantId)) return null;

    const raw = (restaurantItems ?? []).find((item: any) => Number(item?.id) === restaurantId && item?.activo !== false) ?? null;
    return raw ? localizeRestaurant(raw, lang) : null;
  }, [data?.restauranteId, data?.restaurante?.id, restaurantItems, lang]);

  const dateLabel = safeDateLabel(data?.actualizadoEn ?? data?.creadoEn);
  const restaurantName = relatedRestaurant?.nombre || localizeRestaurantName(data?.restaurante as any, lang);
  const typeLabel = data?.destino === "ANUNCIANTES" ? t("advertisers") : t("news");
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <AppHeader />
        <View style={styles.center}>
          <Text style={[styles.muted, { color: c.muted }]}>{lang === "en" ? "This post is not available." : "Esta publicación no está disponible."}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.heroWrap}>
          {data?.imageUrl ? (
            <Pressable onPress={() => setImagePreviewVisible(true)} accessibilityRole="button" accessibilityLabel={lang === "en" ? "Open full post image" : "Abrir imagen completa de la novedad"}>
              <CachedImage uri={data.imageUrl} style={styles.heroImage} resizeMode="cover" />
              <View style={styles.expandHint}><Ionicons name="expand" size={18} color="#fff" /></View>
            </Pressable>
          ) : <View style={[styles.heroImage, { backgroundColor: c.border }]} />}
          <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: c.card }]}> 
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
        </View>

        <View style={[styles.overlayCard, { backgroundColor: c.card, borderColor: c.border }]}> 
          <Text style={[styles.name, { color: c.text }]}>{data?.titulo || t("untitled")}</Text>
          <Text style={[styles.type, { color: c.muted }]}>{typeLabel}</Text>
          <View style={styles.badgesRow}>
            {!!restaurantName && <View style={styles.chip}><Text style={styles.chipText}>{restaurantName}</Text></View>}
            {!!dateLabel && <View style={[styles.chip, styles.dateChip]}><Text style={styles.chipText}>{dateLabel}</Text></View>}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Section title={t("detail")} c={c}><Text style={[styles.value, { color: c.muted }]}>{data?.contenido || t("na")}</Text></Section>
          {!!restaurantName ? (
            <Section title={t("restaurant")} c={c}>
              <Pressable
                onPress={() => navigation.navigate("Restaurantes", { screen: "RestauranteDetalle", params: { restauranteId: data?.restaurante?.id ?? data?.restauranteId } })}
                style={[styles.linkCard, { backgroundColor: c.card, borderColor: c.border }]}
              >
                <Text style={[styles.linkText, { color: c.text }]}>{restaurantName}</Text>
              </Pressable>
            </Section>
          ) : null}
          {(data?.fileUrl || data?.imageUrl) ? (
            <Section title={t("moreInformation")} c={c}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {!!data?.fileUrl && (
                  <Pressable onPress={() => openAssetUrl(data.fileUrl)} style={[styles.actionBtn, { backgroundColor: c.primary }] }>
                    <Text style={[styles.actionText, { color: c.primaryText }]}>{lang === "en" ? "Open file" : "Abrir archivo"}</Text>
                  </Pressable>
                )}
                {!!data?.imageUrl && (
                  <Pressable onPress={() => openAssetUrl(data.imageUrl)} style={[styles.actionBtn, { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }] }>
                    <Text style={[styles.actionText, { color: c.text }]}>{lang === "en" ? "Open image" : "Abrir imagen"}</Text>
                  </Pressable>
                )}
              </View>
            </Section>
          ) : null}
        </View>
      </ScrollView>
      <FullscreenImageModal
        visible={imagePreviewVisible}
        uri={data?.imageUrl}
        title={data?.titulo || t("untitled")}
        onClose={() => setImagePreviewVisible(false)}
      />
    </View>
  );
}

function Section({ title, children, c }: any) {
  return <View style={{ marginTop: 18 }}><Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { fontSize: 17, fontFamily: AppFonts.poppinsRegular },
  heroWrap: { position: 'relative' },
  heroImage: { width: '100%', height: 220 },
  expandHint: { position: 'absolute', right: 16, bottom: 16, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  backBtn: { position: "absolute", top: 16, left: 16, width: 56, height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center", elevation: 5, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  overlayCard: { marginHorizontal: 16, marginTop: -28, borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 14, elevation: 4 },
  name: { fontSize: 21, fontFamily: AppFonts.poppinsSemiBold, fontWeight: '800' },
  type: { marginTop: 2, fontSize: 17, fontFamily: AppFonts.poppinsRegular },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { backgroundColor: '#166534', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  dateChip: { backgroundColor: '#1f2937' },
  chipText: { color: '#fff', fontSize: 14, fontFamily: AppFonts.poppinsSemiBold, fontWeight: '800' },
  sectionTitle: { fontSize: 17, fontFamily: AppFonts.poppinsSemiBold, fontWeight: '800', marginBottom: 8 },
  value: { fontSize: 16, fontFamily: AppFonts.poppinsRegular, lineHeight: 20 },
  actionBtn: { alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  actionText: { fontFamily: AppFonts.poppinsSemiBold, fontWeight: '800' },
  linkCard: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  linkText: { fontFamily: AppFonts.poppinsSemiBold, fontWeight: '800' },
});

export default NovedadDetalleScreen;
