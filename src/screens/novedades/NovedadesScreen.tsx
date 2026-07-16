import React, { useMemo, useState, useRef, useEffect, useDeferredValue, useCallback } from "react";
import { useNavigation, useRoute, useFocusEffect, useNavigationState } from "@react-navigation/native";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Platform, Alert } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { AppFonts } from "@/theme/fonts";
import { SearchBar } from "@/components/SearchBar";
import { DateFilterModal } from "@/components/DateFilterModal";
import { TranslatedText } from "@/components/TranslatedText";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { useOfflineList } from "@/offline/useOfflineList";
import { openAssetUrl } from "@/lib/openAsset";
import { subscribeTabReset } from "@/lib/ui/tabReset";

type News = {
  id: number;
  titulo?: string | null;
  contenido?: string | null;
  imageUrl?: string | null;
  fileUrl?: string | null;
  destino?: "NOVEDADES" | "ANUNCIANTES";
  restauranteId?: number | null;
  restaurante?: { id: number; nombreEs?: string | null; nombreEn?: string | null } | null;
  creadoEn?: string;
  actualizadoEn?: string;
  notifyUsers?: boolean | null;
};

function getNewsTime(item: News) {
  return new Date(item.actualizadoEn || item.creadoEn || 0).getTime() || 0;
}

export function NovedadesScreen() {
  const { t } = useI18n();
  const { palette: c } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const currentRootTab = useNavigationState((state) => state?.routes?.[state.index ?? 0]?.name ?? null);

  const [restaurantFilter, setRestaurantFilter] = useState<number | null>(route.params?.restaurantId ?? null);
  const [q, setQ] = useState(String(route.params?.initialQuery || ""));
  const deferredQuery = useDeferredValue(q);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { items, loading: isLoading, error, refresh, refreshing: isFetching } = useOfflineList<News>("noticias");
  const { items: restaurantItems = [] } = useOfflineList<any>("restaurantes");

  const currentMode: "NOVEDADES" | "ANUNCIANTES" | null = route?.params?.mode ?? null;
  const lastResetKey = useRef<number | null>(null);
  const resetKey: number | undefined = route?.params?.resetKey;
  const initialQuery: string | undefined = route?.params?.initialQuery;

  const clearAllLocalFilters = useCallback(() => {
    setRestaurantFilter(null);
    setQ("");
    setFilterDate(null);
    setFilterOpen(false);
  }, []);

  useEffect(() => {
    return subscribeTabReset((tab) => {
      if (tab !== "Novedades") {
        clearAllLocalFilters();
      }
    });
  }, [clearAllLocalFilters]);

  useFocusEffect(
    useCallback(() => {
      if (currentRootTab !== "Novedades") {
        setQ("");
      }
      return undefined;
    }, [currentRootTab])
  );

  useEffect(() => {
    if (typeof resetKey === "number" && lastResetKey.current !== resetKey) {
      lastResetKey.current = resetKey;
      setRestaurantFilter(null);
      setQ(typeof initialQuery === "string" ? initialQuery : "");
      setFilterDate(null);
      setFilterOpen(false);
      navigation.setParams?.({ restaurantId: null, mode: null, fromRestaurant: null, initialQuery: "" });
      return;
    }

    if (route.params?.restaurantId !== undefined) {
      setRestaurantFilter(route.params.restaurantId ?? null);
    }
  }, [route.params?.restaurantId, route.params?.mode, route.params?.fromRestaurant, resetKey, initialQuery, navigation]);

  useEffect(() => {
    if (typeof initialQuery === "string") setQ(initialQuery);
  }, [initialQuery]);

  const visibleRestaurantIds = useMemo(() => {
    return new Set(
      (restaurantItems ?? [])
        .filter((item: any) => item?.activo !== false)
        .map((item: any) => Number(item?.id))
        .filter((id) => Number.isFinite(id))
    );
  }, [restaurantItems]);

  const visibleNewsItems = useMemo(() => {
    return [...(items ?? [])].filter((item: any) => {
      if (item?.activo === false) return false;
      const rawRestaurantId = item?.restauranteId ?? item?.restaurante?.id;
      if (rawRestaurantId == null) return true;
      const parsedRestaurantId = Number(rawRestaurantId);
      if (!Number.isFinite(parsedRestaurantId)) return true;
      return visibleRestaurantIds.has(parsedRestaurantId);
    });
  }, [items, visibleRestaurantIds]);

  const availableDates = useMemo(() => {
    const seen = new Set<string>();
    const out: Date[] = [];
    for (const item of visibleNewsItems ?? []) {
      if (!item?.creadoEn) continue;
      const d = new Date(item.creadoEn);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      }
    }
    return out.sort((a, b) => b.getTime() - a.getTime());
  }, [visibleNewsItems]);

  const filtered = useMemo(() => {
    const s = deferredQuery.trim().toLowerCase();
    return [...(visibleNewsItems ?? [])]
      .filter((n) => {
        if (currentMode && n.destino !== currentMode) return false;
        if (restaurantFilter && (n.restaurante?.id ?? n.restauranteId) !== restaurantFilter) return false;
        if (filterDate && n.creadoEn) {
          const d = new Date(n.creadoEn);
          if (d.getFullYear() !== filterDate.getFullYear() || d.getMonth() !== filterDate.getMonth() || d.getDate() !== filterDate.getDate()) return false;
        }
        if (!s) return true;
        return `${n.titulo ?? ""} ${n.contenido ?? ""}`.toLowerCase().includes(s);
      })
      .sort((a, b) => getNewsTime(b) - getNewsTime(a));
  }, [visibleNewsItems, currentMode, restaurantFilter, filterDate, deferredQuery]);

  const keyExtractor = useCallback((item: News) => String(item.id), []);

  const renderNewsItem = useCallback(({ item }: { item: News }) => (
    <Pressable onPress={() => navigation.navigate("NovedadDetalle", { newsId: item.id })} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      {!!item.imageUrl && <ResponsiveImage uri={item.imageUrl} />}
      {!!item.fileUrl && (
        <View style={styles.actionsRow}>
          <Pressable onPress={() => openAssetUrl(item.fileUrl)} style={[styles.secondaryBtn, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.secondaryBtnText, { color: c.text }]}>{t("seeMore")}</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  ), [c.card, c.border, c.muted, c.text, navigation, t]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />
      <View style={[styles.searchWrap, { backgroundColor: c.primary }]}>
        <SearchBar value={q} onChangeText={setQ} onPressFilter={() => setFilterOpen(true)} placeholder={t("searchPlaceholder")} variant="onPrimary" activeFiltersCount={filterDate ? 1 : 0} />
      </View>
      <Text style={[styles.pageTitle, { color: c.primary }]}>{t("news")}</Text>

      <DateFilterModal
        visible={filterOpen}
        initialDate={filterDate ?? availableDates[0] ?? new Date()}
        onClose={() => setFilterOpen(false)}
        onClear={() => {
          setFilterDate(null);
          setFilterOpen(false);
        }}
        onApply={(d) => {
          setFilterDate(d);
          setFilterOpen(false);
        }}
      />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : error ? (
        <View style={styles.center}><Text style={{ color: c.danger, fontFamily: AppFonts.poppinsRegular }}>{error}</Text></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderNewsItem}
          contentContainerStyle={{ padding: 14, paddingBottom: 140, flexGrow: filtered.length ? 0 : 1 }}
          ListEmptyComponent={<View style={styles.center}><Text style={{ color: c.muted, fontFamily: AppFonts.poppinsRegular, textAlign: "center" }}>{q ? t("noResults") : t("noNewsYet")}</Text></View>}
          refreshing={isFetching}
          onRefresh={() => refresh()}
          removeClippedSubviews={Platform.OS === "android"}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={50}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  card: { borderWidth: 1, borderRadius: 22, marginBottom: 16, overflow: "hidden", padding: 1 },
  restaurantLink: { marginTop: 4, paddingHorizontal: 12, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
  body: { marginTop: 8, paddingHorizontal: 12, fontSize: 13, fontFamily: AppFonts.poppinsRegular, lineHeight: 18 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12, marginBottom: 12, marginHorizontal: 12 },
  btn: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  btnText: { fontFamily: AppFonts.poppinsMediumItalic },
  secondaryBtn: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  secondaryBtnText: { fontFamily: AppFonts.poppinsMediumItalic },
  searchWrap: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  pageTitle: { textAlign: "center", fontSize: 22, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  activeFilterWrap: { paddingHorizontal: 14, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  activeFilterText: { flex: 1, fontSize: 13, fontFamily: AppFonts.poppinsRegular },
  clearFilterBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});

export default NovedadesScreen;
