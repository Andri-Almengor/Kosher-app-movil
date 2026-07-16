import React, { useCallback, useDeferredValue, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";

import { AppHeader } from "@/components/AppHeader";
import { SearchBar } from "@/components/SearchBar";
import { ProductCard, type ProductCardItem } from "@/components/ProductCard";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { localizeProduct } from "@/features/products/utils/localizeProduct";
import { AppFonts } from "@/theme/fonts";
import { ProductFiltersModal, type ProductFilters } from "./ProductFiltersModal";
import { useOfflineList } from "@/offline/useOfflineList";
import { FilterChipsBar } from "@/components/FilterChipsBar";
import { getCollator, normalizeText } from "@/lib/text";
import { buildSealFilterOptions, matchesMultiValue, uniqueMultiValueOptions } from "@/features/products/utils/filterValueHelpers";

type Producto = ProductCardItem & {
  catGeneral: string;
  tienda?: string | null;
  atributo2?: string | null;
  atributo3?: string | null;
  categoria1?: string | null;
};

export function CategoriaScreen() {
  const { t, lang } = useI18n();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { palette: c } = useTheme();

  const catGeneral = route.params?.catGeneral as string;
  const isPesaj = catGeneral === "__PESAJ__";

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const { items: all = [], loading, error, refresh } = useOfflineList<Producto>("productos");
  const localizedAll = useMemo(() => (all ?? []).map((item: any) => localizeProduct(item, lang) as Producto), [all, lang]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({});

  const title = isPesaj ? t("pesajTitle") : t(catGeneral);

  const categoryBaseItems = useMemo(() => {
    const inCat = localizedAll.filter((p: any) => {
      if (isPesaj) {
        const value = String(p.atributo2 ?? "").toLowerCase();
        return value.includes("pesaj") || value.includes("passover");
      }
      return String(p.catGeneral ?? "").trim() === String(catGeneral ?? "").trim();
    });
    return [...inCat].sort((a: any, b: any) => getCollator(lang).compare(String(a.nombre ?? ""), String(b.nombre ?? "")));
  }, [localizedAll, catGeneral, isPesaj, lang]);

  const items = useMemo(() => {
    const q = normalizeText(deferredQuery);
    if (!q) return categoryBaseItems;

    return categoryBaseItems.filter((p: any) => {
      const hay = [p.nombre, p.fabricanteMarca, p.catGeneral, p.sello, p.certifica, p.tienda, p.categoria1]
        .map(normalizeText)
        .join(" ");
      return hay.includes(q);
    });
  }, [categoryBaseItems, deferredQuery]);

  // Refresca cuando la pantalla vuelve a estar activa (sin polling)
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  const filterOptions = useMemo(() => {
    const uniq = (arr: Array<string | null | undefined>) => {
      const set = new Set<string>();
      for (const v of arr) {
        const s = String(v ?? "").trim();
        if (s) set.add(s);
      }
      return Array.from(set).sort((a, b) => getCollator(lang).compare(a, b));
    };

    return {
      tienda: uniqueMultiValueOptions(items.map((i) => (i as any).tienda), lang),
      sello: uniq(items.map((i) => i.sello)),
      selloVisuales: buildSealFilterOptions(items, lang),
      certifica: uniq(items.map((i) => i.certifica)),
      catGeneral: uniq(items.map((i) => i.catGeneral)),
      categoria1: uniq(items.map((i) => (i as any).categoria1)),
      atributo1: uniq(items.map((i) => i.atributo1)),
      atributo2: uniq(items.map((i) => (i as any).atributo2)),
      atributo3: uniq(items.map((i) => (i as any).atributo3)),
    };
  }, [items, lang]);

  const filteredItems = useMemo(() => {
    const want = {
      tienda: normalizeText(filters.tienda),
      sello: normalizeText(filters.sello),
      certifica: normalizeText(filters.certifica),
      catGeneral: normalizeText(filters.catGeneral),
      categoria1: normalizeText(filters.categoria1),
      atributo1: normalizeText(filters.atributo1),
      atributo2: normalizeText(filters.atributo2),
      atributo3: normalizeText(filters.atributo3),
    };

    return items
      .filter((i: any) => {
      if (want.tienda && !matchesMultiValue(i.tienda, want.tienda)) return false;
      if (want.sello && normalizeText(i.sello) !== want.sello) return false;
      if (want.certifica && normalizeText(i.certifica) !== want.certifica) return false;
      if (want.catGeneral && normalizeText(i.catGeneral) !== want.catGeneral) return false;
      if (want.categoria1 && normalizeText(i.categoria1) !== want.categoria1) return false;
      if (want.atributo1 && normalizeText(i.atributo1) !== want.atributo1) return false;
      if (want.atributo2 && normalizeText(i.atributo2) !== want.atributo2) return false;
      if (want.atributo3 && normalizeText(i.atributo3) !== want.atributo3) return false;
      return true;
    });
  }, [items, filters]);

  
  const activeChips = useMemo(() => {
    const pairs: Array<[keyof ProductFilters, string]> = [
      ["tienda", t("tienda")],
      ["sello", t("selloOptional")],
      ["certifica", t("certificaOptional")],
      ["catGeneral", t("catGeneral")],
      ["categoria1", t("categoria1")],
      ["atributo1", t("atributo1")],
      ["atributo2", t("atributo2")],
    ];

    return pairs
      .map(([k, label]) => {
        const v = String((filters as any)[k] ?? "").trim();
        if (!v) return null;
        return {
          key: String(k),
          label: `${label}: ${v}`,
          onRemove: () => setFilters((prev) => ({ ...(prev as any), [k]: "" })),
        };
      })
      .filter(Boolean) as any[];
  }, [filters, t]);

  const renderItem = useCallback(({ item }: { item: Producto }) => (
    <ProductCard item={item} onPress={() => navigation.navigate("ProductoDetalle", { productoId: item.id })} />
  ), [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />

      <View style={styles.top}>
        <Pressable
          onPress={() => {
            if (navigation.canGoBack?.()) {
              navigation.goBack();
            } else {
              navigation.navigate("ProductosHome");
            }
          }}
          style={[styles.backBtn, { borderColor: c.border, backgroundColor: c.card }]}
          hitSlop={8}
        >
          <Text style={[styles.backText, { color: c.text }]}>‹</Text>
          <Text style={[styles.backLabel, { color: c.text }]}>{t("back")}</Text>
        </Pressable>
        <Text style={[styles.h1, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backSpacer} />
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={query} onChangeText={setQuery} onPressFilter={() => setFiltersOpen(true)} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: c.danger, fontWeight: "900" }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(i) => String(i.id)}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 140 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={renderItem}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={60}
          removeClippedSubviews
        />
      )}

      <ProductFiltersModal
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={filters}
        options={filterOptions}
        onApply={setFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    minWidth: 88,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  backText: { fontSize: 24, lineHeight: 24 },
  backLabel: { fontSize: 14, fontFamily: AppFonts.poppinsMedium, fontWeight: "700" },
  backSpacer: { minWidth: 88 },
  h1: { flex: 1, textAlign: "center", fontSize: 22, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", letterSpacing: 0.2 },
  searchWrap: { paddingHorizontal: 14, paddingBottom: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default CategoriaScreen;
