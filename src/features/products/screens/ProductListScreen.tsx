// src/features/products/screens/ProductListScreen.tsx
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  FlatList,
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Platform,
  UIManager,
  LayoutAnimation,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
  ActivityIndicator,
  Linking,
  Keyboard,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Picker } from "@react-native-picker/picker";

import { ProductRepository } from "../data/ProductRepository";
import { useFavorites } from "@/lib/storage/favoritesStore";
import { ProductCard } from "../components/ProductCard";
import Card from "@/ui/Card";
import Input from "@/ui/Input";
import Button from "@/ui/Button";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";

import type { Product } from "../api/types";
import { useProductFilters } from "../state/filterStore";
import { ProductFilterUtils } from "../data/ProductFilters";

const DONATION_URL =
  "https://www.baccredomatic.com/es-cr/pymes/soluciones-y-herramientas?categoria=todo";

const LOGO_URI =
  "https://res.cloudinary.com/dbp9mpyq0/image/upload/v1767622048/WhatsApp_Image_2026-01-05_at_8.03.59_AM-removebg-preview_zkbyov.png";

export default function ProductListScreen() {
  const nav = useNavigation<any>();
  const { colors } = useTheme();
  const { t } = useI18n();

  // Repo / favorites
  const repo = ProductRepository; // tu repo NO es clase
  const fav = useFavorites();

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters store
  const filterStore = useProductFilters();
  const { setFilter, resetFilters } = filterStore;

  // 🔎 buscador exacto
  const [draftSearch, setDraftSearch] = useState(filterStore.search ?? "");
  const [appliedSearch, setAppliedSearch] = useState(filterStore.search ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasActiveFilters = Boolean(
    filterStore.categoria || filterStore.marca || filterStore.tienda || filterStore.gf
  );

  const filterCount = useMemo(() => {
    return [filterStore.categoria, filterStore.marca, filterStore.tienda, filterStore.gf].filter(
      (x) => !!x
    ).length;
  }, [filterStore.categoria, filterStore.marca, filterStore.tienda, filterStore.gf]);

  const hasSearch = appliedSearch.trim().length > 0;
  const showResults = hasSearch || hasActiveFilters;

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFiltersOpen((prev) => !prev);
  };

  const applySearch = () => {
    Keyboard.dismiss();
    const q = draftSearch.trim();

    // “más exacto”: evitar buscar con 1 caracter
    if (q.length === 1) {
      setAppliedSearch("");
      setFilter("search", undefined);
      return;
    }

    setAppliedSearch(q);
    setFilter("search", q.length ? q : undefined);
  };

  const clearOnlySearch = () => {
    setDraftSearch("");
    setAppliedSearch("");
    setFilter("search", undefined);
  };

  const clearAll = () => {
    resetFilters();
    setDraftSearch("");
    setAppliedSearch("");
    setFilter("search", undefined);
    setFiltersOpen(false);
  };

  const loadProducts = async (opts?: { silent?: boolean; forceRemote?: boolean; preferCache?: boolean }) => {
    const silent = !!opts?.silent;
    try {
      setError(null);
      if (!silent) setInitialLoading(true);
      if (silent) setRefreshing(true);

      // ✅ en tu proyecto list() recibe 0 args y devuelve Product[]
      const res = await repo.list({ forceRemote: opts?.forceRemote, preferCache: opts?.preferCache });
      setProducts(res);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando productos");
    } finally {
      if (!silent) setInitialLoading(false);
      if (silent) setRefreshing(false);
    }
  };

  // Load (cache-first) + refresh remoto una vez
  useEffect(() => {
    // 1) muestra caché si existe (rápido)
    loadProducts({ preferCache: true });
    // 2) intenta remoto en segundo plano (si hay red)
    loadProducts({ silent: true, forceRemote: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh cuando se vuelve a enfocar la pantalla (sin polling)
  const [lastFocusRefreshAt, setLastFocusRefreshAt] = useState(0);
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      if (!lastFocusRefreshAt || now - lastFocusRefreshAt > 30_000) {
        setLastFocusRefreshAt(now);
        loadProducts({ silent: true, forceRemote: true });
      }
      return () => {};
    }, [lastFocusRefreshAt])
  );

  // Options for filters based on loaded products
  const { categorias, marcas, tiendas, gfs } = useMemo(
    () => ProductFilterUtils.extractOptions(products),
    [products]
  );

  // Header
  useLayoutEffect(() => {
    nav.setOptions({
      headerTitle: t("products"),
      headerRight: () => (
        <Pressable onPress={() => nav.navigate("Favorites")} style={{ padding: 12 }}>
          <Ionicons name="heart-outline" size={22} color={colors.primaryText} />
        </Pressable>
      ),
    });
  }, [nav, colors.primaryText]);

  // Apply local filters
  const filteredProducts = useMemo(() => {
    return ProductFilterUtils.applyFilters(products, {
      categoria: filterStore.categoria,
      marca: filterStore.marca,
      tienda: filterStore.tienda,
      gf: filterStore.gf,
      search: filterStore.search,
    });
  }, [
    products,
    filterStore.categoria,
    filterStore.marca,
    filterStore.tienda,
    filterStore.gf,
    filterStore.search,
  ]);

  const DonationLink = () => (
    <Text style={styles.donationText}>
      {t("donationLinkLabel")}{" "}
      <Text style={styles.donationLink} onPress={() => Linking.openURL(DONATION_URL)}>
        {t("donateHere")}
      </Text>
    </Text>
  );

  const FiltersPanel = () => (
    <Card style={styles.filtersCard}>
      <View style={styles.filtersHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="funnel-outline" size={16} color="#111" />
          <Text style={styles.filterTitle}>{t("filters")}</Text>
        </View>

        <Pressable onPress={toggleFilters} hitSlop={10}>
          <Ionicons name="close" size={18} color="#111" />
        </Pressable>
      </View>

      <Text style={styles.filterHint}>{t("filterHintApply")}</Text>

      <Text style={styles.filterLabel}>{t("labelCategory")}</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={filterStore.categoria ?? "Todas"}
          onValueChange={(value) => setFilter("categoria", value === "Todas" ? undefined : value)}
        >
          <Picker.Item label="Todas" value="Todas" />
          {categorias.map((c) => (
            <Picker.Item key={c} label={c} value={c} />
          ))}
        </Picker>
      </View>

      <Text style={styles.filterLabel}>{t("labelBrand")}</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={filterStore.marca ?? "Todas"}
          onValueChange={(value) => setFilter("marca", value === "Todas" ? undefined : value)}
        >
          <Picker.Item label="Todas" value="Todas" />
          {marcas.map((m) => (
            <Picker.Item key={m} label={m} value={m} />
          ))}
        </Picker>
      </View>

      <Text style={styles.filterLabel}>Tienda</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={filterStore.tienda ?? "Todas"}
          onValueChange={(value) => setFilter("tienda", value === "Todas" ? undefined : value)}
        >
          <Picker.Item label="Todas" value="Todas" />
          {tiendas.map((t) => (
            <Picker.Item key={t} label={t} value={t} />
          ))}
        </Picker>
      </View>

      <Text style={styles.filterLabel}>Gluten Free</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={filterStore.gf ?? "Todas"}
          onValueChange={(value) => setFilter("gf", value === "Todas" ? undefined : value)}
        >
          <Picker.Item label="Todas" value="Todas" />
          {gfs.map((g) => (
            <Picker.Item key={g} label={g} value={g} />
          ))}
        </Picker>
      </View>

      <View style={styles.filtersActions}>
        <Button title="Aplicar" onPress={() => { applySearch(); setFiltersOpen(false); }} />
        <Button title="Limpiar" onPress={clearAll} />
      </View>
    </Card>
  );

  const FilterButton = () => (
    <Pressable onPress={toggleFilters} style={styles.filterButton}>
      <Ionicons name={filtersOpen ? "funnel" : "funnel-outline"} size={20} color="#111" />
      {filterCount > 0 && (
        <View style={styles.filterCountPill}>
          <Text style={styles.filterCountTxt}>{filterCount}</Text>
        </View>
      )}
    </Pressable>
  );

  const SearchButton = () => (
    <Pressable onPress={applySearch} style={styles.searchBtn}>
      <Ionicons name="search-outline" size={20} color="#111" />
    </Pressable>
  );

  const ClearSearchButton = () => (
    <Pressable onPress={clearOnlySearch} style={styles.clearBtn} hitSlop={10}>
      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
    </Pressable>
  );

  // ✅ Acceso oculto admin: mantener presionado 3s el logo
  const goHiddenAdmin = () => {
    // Debe existir en tu stack como "AdminAuth"
    nav.navigate("AdminAuth");
  };

  return (
    <View style={styles.container}>
      {!showResults ? (
        <View style={styles.emptyState}>
          <Pressable onLongPress={goHiddenAdmin} delayLongPress={3000} hitSlop={12}>
            <Image source={{ uri: LOGO_URI }} style={styles.logo} resizeMode="contain" />
          </Pressable>

          <View style={styles.searchRowCentered}>
            <Input
              value={draftSearch}
              onChangeText={setDraftSearch}
              placeholder="Buscar por marca, detalle, tienda…"
              style={{ flex: 1 }}
              returnKeyType="search"
              onSubmitEditing={(
                _e: NativeSyntheticEvent<TextInputSubmitEditingEventData>
              ) => applySearch()}
            />

            {!!draftSearch && <ClearSearchButton />}
            <SearchButton />
            <FilterButton />
          </View>

          {filtersOpen && <FiltersPanel />}

          <Text style={styles.helper}>Escribe algo o aplica un filtro para ver los productos.</Text>
          <DonationLink />
        </View>
      ) : (
        <>
          {/* BUSCADOR */}
          <View style={styles.searchRow}>
            <Input
              value={draftSearch}
              onChangeText={setDraftSearch}
              placeholder="Buscar por marca, detalle, tienda…"
              style={{ flex: 1 }}
              returnKeyType="search"
              onSubmitEditing={(
                _e: NativeSyntheticEvent<TextInputSubmitEditingEventData>
              ) => applySearch()}
            />

            {!!draftSearch && <ClearSearchButton />}
            <SearchButton />
            <FilterButton />
          </View>

          {/* INFO RESULTADOS */}
          <View style={styles.resultsBar}>
            <Text style={styles.resultsTxt}>
              Mostrando <Text style={styles.resultsStrong}>{filteredProducts.length}</Text>{" "}
              {filteredProducts.length === 1 ? "producto" : "productos"}
            </Text>

            {(hasSearch || hasActiveFilters) && (
              <Pressable onPress={clearAll} style={styles.clearAllChip}>
                <Ionicons name="trash-outline" size={14} color="#111" />
                <Text style={styles.clearAllTxt}>Limpiar</Text>
              </Pressable>
            )}
          </View>

          {/* FILTROS */}
          {filtersOpen && <FiltersPanel />}

          {/* LISTA */}
          {initialLoading ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.helper}>Cargando productos…</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.helper}>{error}</Text>
              <Button title="Reintentar" onPress={loadProducts} style={{ marginTop: 8 }} />
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingVertical: 8 }}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={7}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews={true}
              refreshing={refreshing}
              onRefresh={() => loadProducts({ silent: true, forceRemote: true })}
              renderItem={({ item }) => (
                <ProductCard
                  item={item}
                  saved={fav.has(item.id)}
                  onToggle={() => fav.toggle(item.id)}
                  onPress={() => nav.navigate("ProductDetail", { product: item })}
                />
              )}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.helper}>No hay productos con esos filtros.</Text>
                  <Button
                    title="Limpiar búsqueda/filtros"
                    onPress={clearAll}
                    style={{ marginTop: 8 }}
                  />
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 12 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  helper: {
    marginTop: 10,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  logo: {
    width: 130,
    height: 130,
    marginBottom: 12,
    borderRadius: 24,
  },

  searchRowCentered: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    maxWidth: 560,
    gap: 8,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },

  searchBtn: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },

  clearBtn: {
    padding: 8,
    borderRadius: 14,
    backgroundColor: "transparent",
  },

  filterButton: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },

  filterCountPill: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },

  resultsBar: {
    marginTop: 6,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  resultsTxt: { color: "#6b7280", fontWeight: "700" },
  resultsStrong: { color: "#111", fontWeight: "900" },

  clearAllChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  clearAllTxt: { fontWeight: "900", color: "#111", fontSize: 12 },

  filtersCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  filtersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  filterTitle: { fontSize: 15, fontWeight: "800", color: "#111" },
  filterHint: { marginTop: 4, fontSize: 12, color: "#6b7280" },

  filterLabel: {
    marginTop: 10,
    marginBottom: 6,
    color: "#374151",
    fontWeight: "700",
  },

  pickerWrap: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFF",
  },

  filtersActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },

  donationText: {
    marginTop: 10,
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },

  donationLink: {
    color: "#2563EB",
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
