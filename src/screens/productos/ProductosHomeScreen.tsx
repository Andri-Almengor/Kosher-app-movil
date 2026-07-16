import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  useWindowDimensions,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import { AppHeader } from "../../components/AppHeader";
import { SearchBar } from "../../components/SearchBar";
import { ProductCard, type ProductCardItem } from "../../components/ProductCard";
import { HomeCard } from "../../components/HomeCard";
import { useTheme } from "../../theme/ThemeProvider";
import { useI18n } from "../../i18n/I18nProvider";
import { localizeProduct } from "../../features/products/utils/localizeProduct";
import { AppFonts } from "../../theme/fonts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getCollator, normalizeText } from "../../lib/text";
import { buildSealFilterOptions, matchesMultiValue, uniqueMultiValueOptions } from "../../features/products/utils/filterValueHelpers";
import { ProductFiltersModal, type ProductFilters } from "./ProductFiltersModal";
import { useOfflineList } from "../../offline/useOfflineList";
import { syncAllIfOnline } from "../../offline/sync";
import {
  getOfflineImagesAsked,
  getOfflineImagesEnabled,
  setOfflineImagesAsked,
  setOfflineImagesEnabled,
  warmProductImages,
  getOfflineImagesSummary,
} from "../../features/products/offlinePrefs";
import { getProductsHomeCardConfig } from "../../features/admin/api/adminUiSettingsApi";
import { subscribeTabReset } from "../../lib/ui/tabReset";

type Producto = ProductCardItem & {
  catGeneral: string;
  fabricanteMarca?: string | null;
  categoria1?: string | null;
  tienda?: string | null;
  atributo1?: string | null;
  atributo2?: string | null;
  atributo3?: string | null;
  sello?: string | null;
  certifica?: string | null;
};

function useDebouncedValue<T>(value: T, delay = 160): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export function ProductosHomeScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { t, lang } = useI18n();
  const { palette: c } = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = width >= 1180 ? 4 : width >= 820 ? 3 : 2;
  const isWide = numColumns > 2;

  const { data: heroConfig, isLoading: heroConfigLoading, refetch: refetchHeroConfig } = useQuery({
    queryKey: ["products-home-card"],
    queryFn: getProductsHomeCardConfig,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });

  const [q, setQ] = useState("");
  const debouncedQuery = useDebouncedValue(q, 180);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({});

  const lastResetKey = useRef<number | null>(null);
  const resetKey: number | undefined = route?.params?.resetKey;
  const initialQuery: string | undefined = route?.params?.initialQuery;

  useEffect(() => {
    if (typeof resetKey !== "number" || lastResetKey.current === resetKey) return;
    lastResetKey.current = resetKey;
    setQ(typeof initialQuery === "string" ? initialQuery : "");
    setFilters({});
    setFiltersOpen(false);
  }, [resetKey, initialQuery]);

  useEffect(() => {
    if (typeof initialQuery === "string") setQ(initialQuery);
  }, [initialQuery]);


  useEffect(() => {
    return subscribeTabReset((tab) => {
      if (tab !== "Productos") {
        setQ("");
        setFilters({});
        setFiltersOpen(false);
      }
    });
  }, []);

  const {
    items: productos = [],
    loading: isLoading,
    error,
    refreshing: isFetching,
    refresh,
  } = useOfflineList<Producto>("productos");

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), refetchHeroConfig()]);
  }, [refresh, refetchHeroConfig]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        try {
          await syncAllIfOnline(console.log);
          if (active) {
            await refreshAll();
          }
        } catch (e) {
          console.log("Error syncing productos screen:", e);
        }
      })();

      return () => {
        active = false;
      };
    }, [refreshAll])
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [asked, enabled] = await Promise.all([
        getOfflineImagesAsked(),
        getOfflineImagesEnabled(),
      ]);

      if (!mounted || asked || !productos.length) return;

      Alert.alert(t("offlineImagesPromptTitle"), t("offlineImagesPromptBody"), [
        {
          text: t("notNow"),
          style: "cancel",
          onPress: async () => {
            await setOfflineImagesAsked(true);
            if (!enabled) await setOfflineImagesEnabled(false);
          },
        },
        {
          text: t("download"),
          onPress: async () => {
            await setOfflineImagesAsked(true);
            await setOfflineImagesEnabled(true);

            const summary = await getOfflineImagesSummary();

            Alert.alert(
              t("offlineImagesDownloadStartedTitle"),
              `${t("offlineImagesDownloadStartedBody")}${
                typeof summary?.stats?.count === "number"
                  ? `\n\n${summary.stats.count} imágenes registradas`
                  : ""
              }`
            );

            void warmProductImages();
          },
        },
      ]);
    })();

    return () => {
      mounted = false;
    };
  }, [productos.length, t]);

  const preparedProductos = useMemo(() => {
    const collator = getCollator(lang);

    return (Array.isArray(productos) ? productos : [])
      .map((item) => {
        const localized = localizeProduct(item as any, lang) as Producto;

        return {
          ...localized,
          _searchBlob: [
            localized.nombre,
            localized.fabricanteMarca,
            localized.catGeneral,
            localized.sello,
            localized.certifica,
            localized.tienda,
            localized.categoria1,
            localized.atributo1,
            localized.atributo2,
            localized.atributo3,
          ]
            .map(normalizeText)
            .join(" "),
          _nameLower: normalizeText(localized.nombre),
        };
      })
      .sort((a, b) =>
        collator.compare(String(a.nombre ?? ""), String(b.nombre ?? ""))
      );
  }, [productos, lang]);

  const filterOptions = useMemo(() => {
    const uniq = (arr: Array<string | null | undefined>) =>
      Array.from(
        new Set(
          arr
            .map((v) => String(v ?? "").trim())
            .filter(Boolean)
            .filter((v) => v !== "#VALUE!")
        )
      ).sort((a, b) => getCollator(lang).compare(a, b));

    return {
      tienda: uniqueMultiValueOptions(preparedProductos.map((p) => p.tienda), lang),
      sello: uniq(preparedProductos.map((p) => p.sello)),
      selloVisuales: buildSealFilterOptions(preparedProductos, lang),
      certifica: uniq(preparedProductos.map((p) => p.certifica)),
      catGeneral: uniq(preparedProductos.map((p) => p.catGeneral)),
      categoria1: uniq(preparedProductos.map((p) => p.categoria1)),
      atributo1: uniq(preparedProductos.map((p) => p.atributo1)),
      atributo2: uniq(preparedProductos.map((p) => p.atributo2)),
      atributo3: uniq(preparedProductos.map((p) => p.atributo3)),
    };
  }, [preparedProductos, lang]);

  const filteredProductos = useMemo(() => {
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

    return preparedProductos.filter((p: any) => {
      if (want.tienda && !matchesMultiValue(p.tienda, want.tienda)) return false;
      if (want.sello && normalizeText(p.sello) !== want.sello) return false;
      if (want.certifica && normalizeText(p.certifica) !== want.certifica) return false;
      if (want.catGeneral && normalizeText(p.catGeneral) !== want.catGeneral) return false;
      if (want.categoria1 && normalizeText(p.categoria1) !== want.categoria1) return false;
      if (want.atributo1 && normalizeText(p.atributo1) !== want.atributo1) return false;
      if (want.atributo2 && normalizeText(p.atributo2) !== want.atributo2) return false;
      if (want.atributo3 && normalizeText(p.atributo3) !== want.atributo3) return false;
      return true;
    });
  }, [preparedProductos, filters]);

  const visibleFilterKeys = heroConfig?.visibleFilters?.length
    ? heroConfig.visibleFilters
    : ["tienda", "sello", "certifica", "catGeneral", "categoria1", "atributo1", "atributo2", "atributo3"];

  const activeFiltersCount = useMemo(
    () =>
      visibleFilterKeys.filter(
        (k: string) => String((filters as any)?.[k] ?? "").trim().length > 0
      ).length,
    [filters, visibleFilterKeys]
  );

  const qLower = useMemo(() => normalizeText(deferredQuery), [deferredQuery]);

  const productResults = useMemo(() => {
    if (!qLower) return filteredProductos;
    return filteredProductos.filter((p: any) => p._searchBlob.includes(qLower));
  }, [filteredProductos, qLower]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          filteredProductos
            .map((p: any) => String(p.catGeneral ?? "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => getCollator(lang).compare(a, b)),
    [filteredProductos, lang]
  );

  const filteredCategories = useMemo(() => {
    if (!qLower) return categories;
    return categories.filter((cat) => normalizeText(cat).includes(qLower));
  }, [categories, qLower]);

  const showingProducts = activeFiltersCount > 0 || !!qLower;

  const clearProductFilters = useCallback(() => {
    setFilters({});
    setQ("");
    setFiltersOpen(false);
  }, []);

  const onPressProduct = useCallback(
    (productId: string | number) => nav.navigate("ProductoDetalle", { productoId: productId }),
    [nav]
  );

  const renderProducto = useCallback(
    ({ item }: { item: Producto }) => (
      <ProductCard item={item} onPress={() => onPressProduct(item.id)} />
    ),
    [onPressProduct]
  );

  const keyExtractor = useCallback((item: Producto) => String(item.id), []);

  const openExternalUrl = useCallback(
    async (url: string) => {
      try {
        if (!url) {
          return Alert.alert(t("moreInformation"), t("linkNotAvailable"));
        }

        const supported = await Linking.canOpenURL(url);
        if (!supported) throw new Error("unsupported_url");

        await Linking.openURL(url);
      } catch {
        Alert.alert(t("error"), t("couldNotOpenLink"));
      }
    },
    [t]
  );

  const heroTitle =
    heroConfig?.showTitle === false
      ? ""
      : lang === "en"
      ? heroConfig?.titleEn || heroConfig?.titleEs || ""
      : heroConfig?.titleEs || heroConfig?.titleEn || "";

  const heroSubtitle =
    heroConfig?.showSubtitle === false
      ? ""
      : lang === "en"
      ? heroConfig?.subtitleEn || heroConfig?.subtitleEs || ""
      : heroConfig?.subtitleEs || heroConfig?.subtitleEn || "";

  const heroImage = heroConfig?.showImage === false ? "" : heroConfig?.imageUrl || "";
  const shouldRenderHeroCard = Boolean(heroImage || heroTitle.trim() || heroSubtitle.trim());

  const Header = (
    <View>
      <Text style={[styles.h1, { color: c.primary }]}>{t("kosherListTitle")}</Text>

      {!heroConfigLoading && heroConfig?.activo !== false ? (
        <View style={styles.homeCardWrap}>
          {shouldRenderHeroCard ? (
            <HomeCard
              title={heroTitle}
              subtitle={heroSubtitle}
              image={heroImage}
              onPress={() => {
                if (heroConfig?.primaryUrl) void openExternalUrl(heroConfig?.primaryUrl || "");
              }}
              hideButton
            />
          ) : null}

          {heroConfig?.showPrimaryButton !== false && !!heroConfig?.primaryUrl && (
            <Pressable
              onPress={() => {
                void openExternalUrl(heroConfig?.primaryUrl || "");
              }}
              style={[styles.primaryHeroBtn, { backgroundColor: c.primary }]}
            >
              <Text style={styles.heroBtnText}>
                {lang === "en"
                  ? heroConfig?.primaryButtonEn || heroConfig?.primaryButtonEs || ""
                  : heroConfig?.primaryButtonEs || heroConfig?.primaryButtonEn || ""}
              </Text>
            </Pressable>
          )}

          {heroConfig?.showSecondaryButton !== false && !!heroConfig?.secondaryUrl && (
            <Pressable
              onPress={() => {
                void openExternalUrl(heroConfig?.secondaryUrl || "");
              }}
              style={[
                styles.secondaryHeroBtn,
                { backgroundColor: c.primary, borderColor: c.border },
              ]}
            >
              <Text style={styles.heroBtnText}>
                {lang === "en"
                  ? heroConfig?.secondaryButtonEn || heroConfig?.secondaryButtonEs || ""
                  : heroConfig?.secondaryButtonEs || heroConfig?.secondaryButtonEn || ""}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <View style={styles.sectionTitle}>
        <Text style={styles.sectionTitleText}>{t("categories")}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <AppHeader />

      <View style={[styles.searchWrap, { backgroundColor: c.primary }]}>
        <SearchBar
          value={q}
          onChangeText={setQ}
          onPressFilter={() => setFiltersOpen(true)}
          placeholder={t("searchPlaceholder")}
          variant="onPrimary"
          activeFiltersCount={activeFiltersCount}
        />
      </View>

      {isLoading || isFetching ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={[styles.help, { color: c.muted }]}>{t("loadingProducts")}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.help, { color: c.danger }]}>
            {t("backendErrorTitle")}
          </Text>
          <Text style={[styles.help, { color: c.muted, marginTop: 10 }]}>
            No se pudo sincronizar la información de productos.
          </Text>
        </View>
      ) : showingProducts ? (
        <FlatList
          key={`products-grid-${numColumns}`}
          data={productResults}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          contentContainerStyle={styles.productsListContent}
          columnWrapperStyle={numColumns > 1 ? styles.productsColumn : undefined}
          renderItem={renderProducto}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={9}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <Text style={[styles.h1, { color: c.primary }]}>{t("kosherListTitle")}</Text>

              <View style={styles.resultsHeaderRow}>
                <Text style={[styles.resultsTitle, { color: c.text }]}>{t("results")}</Text>

                {activeFiltersCount > 0 ? (
                  <Pressable
                    onPress={clearProductFilters}
                    style={[styles.clearFiltersBtn, { backgroundColor: c.card, borderColor: c.border }]}
                  >
                    <Ionicons name="close-circle-outline" size={15} color={c.primary} />
                    <Text style={[styles.clearFiltersText, { color: c.primary }]}>Quitar filtros</Text>
                  </Pressable>
                ) : null}
              </View>

              {productResults.length === 0 ? (
                <Text
                  style={[
                    styles.help,
                    { color: c.muted, marginTop: 10, paddingHorizontal: 14 },
                  ]}
                >
                  No hay productos disponibles. Verifica la conexión con el backend o la sincronización offline.
                </Text>
              ) : null}
            </View>
          }
          extraData={numColumns}
          refreshing={isFetching || heroConfigLoading}
          onRefresh={() => refreshAll()}
        />
      ) : (
        <FlatList
          key="categories-list"
          data={filteredCategories}
          keyExtractor={(i) => i}
          contentContainerStyle={styles.categoriesListContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.categoryRow, { borderBottomColor: c.border }]}
              onPress={() => {
                setFilters((prev) => ({ ...prev, catGeneral: item }));
                setQ("");
              }}
            >
              <Text style={[styles.categoryText, { color: c.text }]}>{item}</Text>
            </Pressable>
          )}
          ListHeaderComponent={Header}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 14, paddingTop: 20 }}>
              <Text style={[styles.help, { color: c.muted }]}>
                No hay productos cargados en el almacenamiento local todavía.
              </Text>
            </View>
          }
          refreshing={isFetching || heroConfigLoading}
          onRefresh={() => refreshAll()}
        />
      )}

      <ProductFiltersModal
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={filters}
        options={filterOptions}
        visibleKeys={visibleFilterKeys as any}
        onApply={(f) => setFilters(f)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  h1: {
    fontSize: 24,
    fontFamily: AppFonts.poppinsSemiBold,
    fontWeight: "800",
    letterSpacing: 0.2,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  homeCardWrap: {
    paddingHorizontal: 14,
    gap: 10,
  },
  sectionTitle: {
    marginHorizontal: 14,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#f0c300",
  },
  sectionTitleText: {
    fontSize: 22,
    fontFamily: AppFonts.poppinsSemiBold,
    fontWeight: "800",
    letterSpacing: 0.2,
    color: "#ffffff",
  },
  categoryRow: {
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  categoryText: {
    fontSize: 20,
    fontFamily: AppFonts.poppinsSemiBold,
    fontWeight: "800",
    opacity: 0.95,
  },
  productsListContent: {
    paddingHorizontal: 14,
    paddingBottom: 140,
  },
  productsColumn: {
    gap: 12,
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  help: {
    fontFamily: AppFonts.poppinsRegular,
    textAlign: "center",
  },
  resultsHeaderRow: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontFamily: AppFonts.poppinsSemiBold,
    flexShrink: 0,
  },
  categoriesListContent: {
    paddingBottom: 140,
  },
  clearFiltersBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: "58%",
  },
  clearFiltersText: {
    fontFamily: AppFonts.poppinsSemiBold,
    fontSize: 12,
    fontWeight: "700",
  },
  primaryHeroBtn: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryHeroBtn: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  heroBtnText: {
    color: "#fff",
    fontFamily: AppFonts.poppinsSemiBold,
    fontWeight: "800",
  },
});

export default ProductosHomeScreen;