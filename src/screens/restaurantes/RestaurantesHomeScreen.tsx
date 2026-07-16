import React, { useDeferredValue, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AppHeader } from "@/components/AppHeader";
import { SearchBar } from "@/components/SearchBar";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { AppFonts } from "@/theme/fonts";
import { CachedImage } from "@/components/CachedImage";
import { useOfflineList } from "@/offline/useOfflineList";
import type { Restaurant } from "@/features/restaurants/api/restaurantsApi";
import { AppIcon } from "@/components/AppIcon";
import { subscribeTabReset } from "@/lib/ui/tabReset";
import { getCollator, normalizeText } from "@/lib/text";
import { localizeRestaurant, type LocalizedRestaurant } from "@/features/restaurants/utils/localizeRestaurant";

export function RestaurantesHomeScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { t, lang } = useI18n();
  const { palette: c } = useTheme();
  const [q, setQ] = useState(String(route?.params?.initialQuery || ""));
  const deferredQuery = useDeferredValue(q);
  const [tipo, setTipo] = useState<string>("");
  const { items = [], loading, error, refreshing, refresh } = useOfflineList<Restaurant>("restaurantes");

  const lastResetKey = useRef<number | null>(null);
  const resetKey: number | undefined = route?.params?.resetKey;
  const initialQuery: string | undefined = route?.params?.initialQuery;
  useEffect(() => {
    if (typeof resetKey !== "number") return;
    if (lastResetKey.current === resetKey) return;
    lastResetKey.current = resetKey;
    setQ(typeof initialQuery === "string" ? initialQuery : "");
    setTipo("");
    return;
  }, [resetKey, initialQuery]);

  useEffect(() => {
    if (typeof initialQuery === "string" && initialQuery !== q) setQ(initialQuery);
  }, [initialQuery, q]);

  useEffect(() => {
    return subscribeTabReset((tab) => {
      if (tab !== "Restaurantes") {
        setQ("");
        setTipo("");
      }
    });
  }, []);

  const visibleItems = useMemo(() => {
    return [...(items ?? [])].filter((item: any) => item?.activo !== false);
  }, [items]);

  const localizedItems = useMemo(
    () => visibleItems.map((item) => localizeRestaurant(item as Restaurant, lang)),
    [visibleItems, lang]
  );

  const tipos = useMemo(() => {
    return Array.from(
      new Set(localizedItems.map((x) => String(x?.tipo || "").trim()).filter(Boolean))
    ).sort((a, b) => getCollator(lang).compare(a, b));
  }, [localizedItems, lang]);

  const filtered = useMemo(() => {
    const s = normalizeText(deferredQuery);
    return localizedItems
      .filter((item) => {
        if (tipo && String(item?.tipo ?? "") !== tipo) return false;
        if (!s) return true;
        const hay = [item.nombre, item.tipo, item.ubicacion, item.acercaDe, item.direccion]
          .map(normalizeText)
          .join(" ");
        return hay.includes(s);
      })
      .sort((a: any, b: any) => {
        const at = new Date((a?.actualizadoEn || a?.creadoEn || 0) as any).getTime() || 0;
        const bt = new Date((b?.actualizadoEn || b?.creadoEn || 0) as any).getTime() || 0;
        return bt - at;
      });
  }, [localizedItems, deferredQuery, tipo]);

  const keyExtractor = useCallback((item: Restaurant) => String(item.id), []);
  const onPressRestaurant = useCallback((id: string | number) => nav.navigate("RestauranteDetalle", { restauranteId: id }), [nav]);
  const renderRestaurant = useCallback(({ item }: { item: LocalizedRestaurant<Restaurant> }) => (
    <Pressable style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} onPress={() => onPressRestaurant(item.id)}>
      {!!item.imageUrl && <CachedImage uri={item.imageUrl} style={styles.image} resizeMode="cover" />}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: c.text }]}>{item.nombre || t("untitled")}</Text>
        <Text style={[styles.cardSub, { color: c.muted }]}>{item.tipo || t("na")}</Text>
        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <AppIcon name="ubicacion" size={16} />
            <Text numberOfLines={1} style={[styles.footerText, { color: c.text }]}>{item.ubicacion || t("na")}</Text>
          </View>
          <View style={styles.footerItem}>
            <AppIcon name="masInformacion" size={16} />
            <Text style={[styles.footerText, { color: c.text }]}>{lang === "en" ? "Open detail" : "Abrir detalle"}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  ), [c.card, c.border, c.muted, c.text, lang, onPressRestaurant, t]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />
      <View style={[styles.searchWrap, { backgroundColor: c.primary }]}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t("restaurantsSearchPlaceholder")} variant="onPrimary" onPressFilter={tipo ? () => setTipo("") : undefined} activeFiltersCount={tipo ? 1 : 0} />
      </View>

      <Text style={[styles.title, { color: c.primary }]}>{t("restaurantsTitle")}</Text>

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ padding: 14, paddingBottom: 140, gap: 14 }}
        ListHeaderComponent={
          <View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[{ key: "all", label: t("all") }, ...tipos.map((x) => ({ key: x, label: x }))]}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
              renderItem={({ item }) => {
                const active = (item.key === "all" && !tipo) || item.key === tipo;
                return (
                  <Pressable
                    onPress={() => setTipo(item.key === "all" ? "" : item.key)}
                    style={[styles.chip, { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primary : c.card }]}
                  >
                    <Text style={[styles.chipText, { color: active ? c.primaryText : c.text }]}>{item.label}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        }
        renderItem={renderRestaurant as any}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: error ? c.danger : c.muted, fontFamily: AppFonts.poppinsRegular, textAlign: "center" }}>
              {loading ? t("loadingRestaurants") : error ? error : q || tipo ? t("noResults") : t("noRestaurantsYet")}
            </Text>
            {!loading ? (
              <Pressable onPress={() => refresh()} style={[styles.retry, { borderColor: c.border }]}>
                <Text style={{ color: c.text, fontFamily: AppFonts.poppinsMediumItalic }}>{t("retry")}</Text>
              </Pressable>
            ) : null}
          </View>
        }
        refreshing={refreshing}
        onRefresh={() => refresh()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  title: { textAlign: "center", fontSize: 22, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", paddingTop: 14, paddingBottom: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: AppFonts.poppinsMediumItalic, fontSize: 13 },
  card: { borderWidth: 1, borderRadius: 18, overflow: "hidden", marginBottom: 14 },
  image: { width: "100%", height: 175 },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 17, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
  cardSub: { fontSize: 13, fontFamily: AppFonts.poppinsRegular, marginTop: 2 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 14 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  footerText: { fontSize: 13, fontFamily: AppFonts.poppinsRegular, flex: 1 },
  center: { padding: 24, alignItems: "center", justifyContent: "center" },
  retry: { marginTop: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
});

export default RestaurantesHomeScreen;
