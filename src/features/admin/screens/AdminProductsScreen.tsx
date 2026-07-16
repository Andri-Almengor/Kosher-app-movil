import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, Alert, ActivityIndicator, RefreshControl, ScrollView, useWindowDimensions, Modal, KeyboardAvoidingView, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeFormModal from "@/components/layout/SafeFormModal";
import { useDebouncedValue } from "@/features/admin/hooks/useDebouncedValue";
import { AdminCommandBar, AdminFloatingActionButton, AdminSavingOverlay } from "@/features/admin/components/AdminExperience";

import { useTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/app/auth/authStore";
import { useI18n } from "@/i18n/I18nProvider";
import { localizeProduct } from "@/features/products/utils/localizeProduct";
import { listAdminProducts, createAdminProduct, updateAdminProduct, deleteAdminProduct, importProductsExcel, listAdminProductSeals, createAdminProductSeal, type AdminProduct } from "@/features/admin/api/adminProductsApi";
import { CreatableSelect } from "@/components/CreatableSelect";
import ImagePickerUpload from "@/components/ImagePickerUpload";
import CachedImage from "@/components/CachedImage";
import { exportRowsToExcel, pickExcelDocument } from "@/features/admin/utils/excelIO";
import { resolveOptionTranslation, translateField } from "@/features/admin/utils/bilingualAutofill";
import { getAdminProductsHomeCardConfig, updateAdminProductsHomeCardConfig, type ProductsHomeCardConfig } from "@/features/admin/api/adminUiSettingsApi";
import { uniqueMultiValueOptions } from "@/features/products/utils/filterValueHelpers";

type Mode = "create" | "edit";
type FieldProps = { label: string; value: string; onChange: (value: string) => void; };
type ExistingSealOption = {
  valueEs: string;
  valueEn: string;
  imageUrl: string;
};

const emptyForm: Omit<AdminProduct, "id"> = {
  catGeneral: "", catGeneralEn: "", categoria1: "", categoria1En: "", fabricanteMarca: "", fabricanteMarcaEn: "", nombre: "", nombreEn: "",
  certifica: "", certificaEn: "", sello: "", selloEn: "", atributo1: "", atributo1En: "", atributo2: "", atributo2En: "", atributo3: "", atributo3En: "",
  tienda: "", tiendaEn: "", fotoProducto: "", fotoSello1: "", fotoSello2: "", creadoEn: null, actualizadoEn: null,
};

type TranslationPair = { nombreEs: string; nombreEn: string };
type OptionBundle = { pairs: TranslationPair[]; es: string[]; en: string[] };

function normalizeOption(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function byLocale(a: string, b: string) {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

function buildOptionBundle(
  items: AdminProduct[],
  getEs: (item: AdminProduct) => string | null | undefined,
  getEn: (item: AdminProduct) => string | null | undefined,
): OptionBundle {
  const map = new Map<string, TranslationPair>();

  for (const item of items) {
    const es = String(getEs(item) ?? "").trim();
    const en = String(getEn(item) ?? "").trim();
    const nombreEs = es || en;
    const nombreEn = en || es;

    if (!nombreEs && !nombreEn) continue;

    const key = normalizeOption(nombreEs || nombreEn);
    const current = map.get(key);

    if (!current) {
      map.set(key, { nombreEs, nombreEn });
      continue;
    }

    if (!current.nombreEn && nombreEn) current.nombreEn = nombreEn;
    if (!current.nombreEs && nombreEs) current.nombreEs = nombreEs;
  }

  const pairs = Array.from(map.values()).sort((a, b) => byLocale(a.nombreEs, b.nombreEs));
  const es = pairs.map((item) => item.nombreEs);
  const en = Array.from(new Set(pairs.map((item) => item.nombreEn).filter(Boolean))).sort(byLocale);

  return { pairs, es, en };
}

export default function AdminProductsScreen() {
  const { t, lang } = useI18n();
  const { palette: c } = useTheme();
  const isAdmin = useAuth((s) => s.isAdmin());
  const token = useAuth((s) => s.token);
  const hydrated = useAuth((s) => s.hydrated);
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 390;

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 160);
  const [modalOpen, setModalOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [secondarySealLabel, setSecondarySealLabel] = useState("");
  const [localSealOptions, setLocalSealOptions] = useState<ExistingSealOption[]>([]);

  const { data: products = [], isLoading, isFetching, error } = useQuery({
    queryKey: ["admin-products"], queryFn: listAdminProducts, enabled: hydrated && isAdmin && !!token, retry: 1, staleTime: 120_000, gcTime: 15 * 60_000, refetchOnMount: false, refetchOnWindowFocus: false,
  });
  const { data: backendSealOptions = [] } = useQuery({
    queryKey: ["admin-product-seals"], queryFn: listAdminProductSeals, enabled: hydrated && isAdmin && !!token, retry: 1, staleTime: 120_000, gcTime: 15 * 60_000, refetchOnMount: false, refetchOnWindowFocus: false,
  });
  const { data: heroConfig } = useQuery({
    queryKey: ["admin-products-home-card"], queryFn: getAdminProductsHomeCardConfig, enabled: hydrated && isAdmin && !!token,
  });
  const [heroDraft, setHeroDraft] = useState<ProductsHomeCardConfig | null>(null);

  React.useEffect(() => { if (heroConfig) setHeroDraft(heroConfig); }, [heroConfig]);

  const localizedProducts = useMemo(() => products.map((p) => localizeProduct(p as any, lang) as AdminProduct), [products, lang]);
  const filtered = useMemo(() => {
    const s = debouncedQ.trim().toLowerCase();
    if (!s) return localizedProducts;
    return localizedProducts.filter((p) => `${p.catGeneral} ${p.categoria1} ${p.fabricanteMarca} ${p.nombre} ${p.tienda ?? ""}`.toLowerCase().includes(s));
  }, [localizedProducts, debouncedQ]);

  const sealPhotoOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const item of products) {
      const a = String(item.fotoSello1 ?? "").trim();
      const b = String(item.fotoSello2 ?? "").trim();
      if (a) uniq.add(a);
      if (b) uniq.add(b);
    }
    return Array.from(uniq).sort(byLocale);
  }, [products]);

  const existingSealOptions = useMemo<ExistingSealOption[]>(() => {
    const map = new Map<string, ExistingSealOption>();

    const addOption = (option: Partial<ExistingSealOption> & { nombreEs?: string | null; nombreEn?: string | null; valueEs?: string | null; valueEn?: string | null; imageUrl?: string | null }) => {
      const valueEs = String(option.valueEs ?? option.nombreEs ?? option.valueEn ?? option.nombreEn ?? "").trim();
      const valueEn = String(option.valueEn ?? option.nombreEn ?? valueEs).trim();
      const imageUrl = String(option.imageUrl ?? "").trim();
      const key = normalizeOption(valueEs || valueEn);
      if (!key || !imageUrl) return;
      const current = map.get(key);
      if (!current) {
        map.set(key, { valueEs, valueEn: valueEn || valueEs, imageUrl });
        return;
      }
      if (!current.valueEs && valueEs) current.valueEs = valueEs;
      if (!current.valueEn && valueEn) current.valueEn = valueEn;
      if (!current.imageUrl && imageUrl) current.imageUrl = imageUrl;
    };

    backendSealOptions.forEach(addOption);
    localSealOptions.forEach(addOption);

    for (const item of products) {
      addOption({ valueEs: item.sello, valueEn: item.selloEn, imageUrl: item.fotoSello1 ?? item.fotoSello2 ?? "" });
    }

    return Array.from(map.values()).sort((a, b) => byLocale(a.valueEs || a.valueEn, b.valueEs || b.valueEn));
  }, [products, backendSealOptions, localSealOptions]);

  const opts = useMemo(() => ({
    catGeneral: buildOptionBundle(products, (p) => p.catGeneral, (p) => p.catGeneralEn),
    categoria1: buildOptionBundle(products, (p) => p.categoria1, (p) => p.categoria1En),
    fabricanteMarca: buildOptionBundle(products, (p) => p.fabricanteMarca, (p) => p.fabricanteMarcaEn),
    certifica: buildOptionBundle(products, (p) => p.certifica, (p) => p.certificaEn),
    sello: buildOptionBundle(products, (p) => p.sello, (p) => p.selloEn),
    atributo1: buildOptionBundle(products, (p) => p.atributo1, (p) => p.atributo1En),
    atributo2: buildOptionBundle(products, (p) => p.atributo2, (p) => p.atributo2En),
    atributo3: buildOptionBundle(products, (p) => p.atributo3, (p) => p.atributo3En),
    tienda: buildOptionBundle(products, (p) => p.tienda, (p) => p.tiendaEn),
  }), [products]);

  const storeOptionsEs = useMemo(() => uniqueMultiValueOptions(opts.tienda.es, lang), [opts.tienda.es, lang]);
  const storeOptionsEn = useMemo(() => uniqueMultiValueOptions(opts.tienda.en, lang), [opts.tienda.en, lang]);

  const refreshAdminList = React.useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["admin-products"] });
  }, [qc]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-products"] });
    await qc.invalidateQueries({ queryKey: ["admin-products-home-card"] });
    await qc.invalidateQueries({ queryKey: ["admin-product-seals"] });
  };

  const createSealMut = useMutation({
    mutationFn: createAdminProductSeal,
    onSuccess: async (saved) => {
      await qc.invalidateQueries({ queryKey: ["admin-product-seals"] });
      const option = {
        valueEs: String(saved.valueEs ?? saved.nombreEs ?? ""),
        valueEn: String(saved.valueEn ?? saved.nombreEn ?? saved.valueEs ?? saved.nombreEs ?? ""),
        imageUrl: String(saved.imageUrl ?? ""),
      };
      setLocalSealOptions((current) => [option, ...current.filter((item) => normalizeOption(item.valueEs || item.valueEn) !== normalizeOption(option.valueEs || option.valueEn))]);
      setForm((current) => ({ ...current, sello: option.valueEs, selloEn: option.valueEn, fotoSello1: option.imageUrl }));
      Alert.alert("Sello guardado", "El sello se guardó en el backend y ya queda disponible para otros productos y otros usuarios.");
    },
    onError: (e: any) => Alert.alert("No se pudo guardar el sello", e?.response?.data?.message ?? "Revisa que el sello tenga nombre, imagen y que no esté duplicado."),
  });

  const createMut = useMutation({ mutationFn: createAdminProduct, onSuccess: async () => { await invalidate(); setModalOpen(false); setForm({ ...emptyForm }); setSecondarySealLabel(""); setLocalSealOptions([]); Alert.alert(t("done"), t("productCreated")); }, onError: (e: any) => Alert.alert(t("error"), e?.response?.data?.message ?? t("couldNotCreateProduct")) });
  const updateMut = useMutation({ mutationFn: ({ id, payload }: { id: number; payload: any }) => updateAdminProduct(id, payload), onSuccess: async () => { await invalidate(); setModalOpen(false); setForm({ ...emptyForm }); setSecondarySealLabel(""); setLocalSealOptions([]); setEditing(null); Alert.alert(t("done"), t("productUpdated")); }, onError: (e: any) => Alert.alert(t("error"), e?.response?.data?.message ?? t("couldNotUpdateProduct")) });
  const deleteMut = useMutation({ mutationFn: deleteAdminProduct, onSuccess: async () => { await invalidate(); Alert.alert(t("done"), t("productDeleted")); }, onError: (e: any) => Alert.alert(t("error"), e?.response?.data?.message ?? t("couldNotDeleteProduct")) });
  const importMut = useMutation({ mutationFn: importProductsExcel, onSuccess: async (data: any) => { await invalidate(); Alert.alert(t("importCompleted"), data?.message ?? t("done")); }, onError: (e: any) => Alert.alert(t("error"), e?.response?.data?.message ?? t("importFailed")) });
  const saveHeroMut = useMutation({ mutationFn: updateAdminProductsHomeCardConfig, onSuccess: async () => { await invalidate(); setConfigOpen(false); Alert.alert(t("done"), "Tarjeta principal actualizada."); }, onError: (e: any) => Alert.alert(t("error"), e?.response?.data?.message ?? "No se pudo guardar la tarjeta principal.") });

  const openCreate = () => { setMode("create"); setEditing(null); setForm({ ...emptyForm }); setSecondarySealLabel(""); setLocalSealOptions([]); setModalOpen(true); };
  const openEdit = (localized: AdminProduct) => {
    const original = products.find((p) => p.id === localized.id) ?? localized;
    setMode("edit"); setEditing(original); setLocalSealOptions([]); setForm({ ...emptyForm, ...original, catGeneral: original.catGeneral ?? "", catGeneralEn: original.catGeneralEn ?? "", categoria1: original.categoria1 ?? "", categoria1En: original.categoria1En ?? "", fabricanteMarca: original.fabricanteMarca ?? "", fabricanteMarcaEn: original.fabricanteMarcaEn ?? "", nombre: original.nombre ?? "", nombreEn: original.nombreEn ?? "", certifica: original.certifica ?? "", certificaEn: original.certificaEn ?? "", sello: original.sello ?? "", selloEn: original.selloEn ?? "", atributo1: original.atributo1 ?? "", atributo1En: original.atributo1En ?? "", atributo2: original.atributo2 ?? "", atributo2En: original.atributo2En ?? "", atributo3: original.atributo3 ?? "", atributo3En: original.atributo3En ?? "", tienda: original.tienda ?? "", tiendaEn: original.tiendaEn ?? "", fotoProducto: original.fotoProducto ?? "", fotoSello1: original.fotoSello1 ?? "", fotoSello2: original.fotoSello2 ?? "" }); setSecondarySealLabel((() => { const match = existingSealOptions.find((option) => normalizeOption(option.imageUrl) === normalizeOption(original.fotoSello2)); return match ? (match.valueEs || match.valueEn) : ""; })()); setModalOpen(true);
  };

  const createSealFromPicker = React.useCallback(async (payload: { nombreEs: string; nombreEn?: string; imageUrl: string }) => {
    const saved = await createSealMut.mutateAsync(payload);
    const option: ExistingSealOption = {
      valueEs: String((saved as any)?.valueEs ?? (saved as any)?.nombreEs ?? payload.nombreEs ?? ""),
      valueEn: String((saved as any)?.valueEn ?? (saved as any)?.nombreEn ?? payload.nombreEn ?? payload.nombreEs ?? ""),
      imageUrl: String((saved as any)?.imageUrl ?? payload.imageUrl ?? ""),
    };
    return option;
  }, [createSealMut]);

  const onSave = () => {
    if (!form.catGeneral || !form.categoria1 || !form.fabricanteMarca || !form.nombre) return Alert.alert(t("requiredFields"), t("requiredFieldsProductsMsg"));
    if ((String(form.sello ?? "").trim() || String(form.selloEn ?? "").trim()) && !String(form.fotoSello1 ?? "").trim()) {
      return Alert.alert("Imagen requerida", "El sello principal necesita una imagen antes de guardar el producto.");
    }
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : v ?? null]));
    if (savingProduct) return;
    if (mode === "create") createMut.mutate(payload as any); else if (editing) updateMut.mutate({ id: editing.id, payload });
  };

  const autoFillEnglish = async () => {
    try {
      const [catGeneralEn, categoria1En, fabricanteMarcaEn, nombreEn, certificaEn, selloEn, atributo1En, atributo2En, atributo3En, tiendaEn] = await Promise.all([
        form.catGeneralEn || !form.catGeneral ? Promise.resolve(form.catGeneralEn) : resolveOptionTranslation(form.catGeneral, opts.catGeneral.pairs),
        form.categoria1En || !form.categoria1 ? Promise.resolve(form.categoria1En) : resolveOptionTranslation(form.categoria1, opts.categoria1.pairs),
        form.fabricanteMarcaEn || !form.fabricanteMarca ? Promise.resolve(form.fabricanteMarcaEn) : resolveOptionTranslation(form.fabricanteMarca, opts.fabricanteMarca.pairs),
        form.nombreEn || !form.nombre ? Promise.resolve(form.nombreEn) : translateField(form.nombre),
        form.certificaEn || !form.certifica ? Promise.resolve(form.certificaEn) : resolveOptionTranslation(form.certifica || "", opts.certifica.pairs),
        form.selloEn || !form.sello ? Promise.resolve(form.selloEn) : resolveOptionTranslation(form.sello || "", opts.sello.pairs),
        form.atributo1En || !form.atributo1 ? Promise.resolve(form.atributo1En) : resolveOptionTranslation(form.atributo1 || "", opts.atributo1.pairs),
        form.atributo2En || !form.atributo2 ? Promise.resolve(form.atributo2En) : resolveOptionTranslation(form.atributo2 || "", opts.atributo2.pairs),
        form.atributo3En || !form.atributo3 ? Promise.resolve(form.atributo3En) : resolveOptionTranslation(form.atributo3 || "", opts.atributo3.pairs),
        form.tiendaEn || !form.tienda ? Promise.resolve(form.tiendaEn) : resolveOptionTranslation(form.tienda || "", opts.tienda.pairs),
      ]);
      setForm((s) => ({ ...s, catGeneralEn: catGeneralEn || "", categoria1En: categoria1En || "", fabricanteMarcaEn: fabricanteMarcaEn || "", nombreEn: nombreEn || "", certificaEn: certificaEn || "", selloEn: selloEn || "", atributo1En: atributo1En || "", atributo2En: atributo2En || "", atributo3En: atributo3En || "", tiendaEn: tiendaEn || "" }));
      Alert.alert(t("done"), "Campos EN autocompletados.");
    } catch {
      Alert.alert(t("error"), "No se pudieron autocompletar los campos EN.");
    }
  };

  const pickExcel = async () => { const file = await pickExcelDocument(); if (file) importMut.mutate(file as any); };
  const exportToExcel = async (rows: AdminProduct[]) => {
    try { const uri = await exportRowsToExcel({ rows, columns: [{ key: "catGeneral", title: "Cat.General", width: 22 }, { key: "catGeneralEn", title: "EN General Categories", width: 24 }, { key: "categoria1", title: "Sub Categoria", width: 22 }, { key: "categoria1En", title: "EN Sub Categorie", width: 24 }, { key: "fabricanteMarca", title: "Fabricante/Marca", width: 24 }, { key: "fabricanteMarcaEn", title: "EN Manufacturer/Brand", width: 24 }, { key: "nombre", title: "Nombre", width: 28 }, { key: "nombreEn", title: "EN Product Name", width: 28 }, { key: "certifica", title: "Condicion", width: 18 }, { key: "certificaEn", title: "EN Certification", width: 20 }, { key: "sello", title: "Sello/Autoriza", width: 20 }, { key: "selloEn", title: "EN Hechsher", width: 20 }, { key: "atributo1", title: "Status", width: 18 }, { key: "atributo1En", title: "EN Status", width: 18 }, { key: "atributo2", title: "Especiales", width: 18 }, { key: "atributo2En", title: "EN Quality 2", width: 18 }, { key: "atributo3", title: "Atributo 3", width: 18 }, { key: "atributo3En", title: "EN Quality 3", width: 18 }, { key: "tienda", title: "Tienda", width: 22 }, { key: "tiendaEn", title: "EN Store", width: 22 }], sheetName: t("products"), filename: `productos_kosher_${Date.now()}.xlsx` }); if (uri) Alert.alert(t("fileCreated"), `${t("savedAt")}: ${uri}`); } catch { Alert.alert(t("error"), t("exportFailed")); }
  };

  const onDelete = (item: AdminProduct) => {
    if (deleteMut.isPending) return;
    Alert.alert("¿Estás seguro?", "¿Deseas eliminar este registro?", [
      { text: "No", style: "cancel" },
      { text: "Sí", style: "destructive", onPress: () => deleteMut.mutate(item.id) },
    ]);
  };

  const savingProduct = createMut.isPending || updateMut.isPending;

  if (!hydrated) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator /></View>;
  if (!isAdmin) return <View style={[styles.center, { backgroundColor: c.bg }]}><Text style={{ color: c.text, fontWeight: "900" }}>{t("adminOnly")}</Text></View>;

  return (
    <View style={[styles.root, compact && styles.rootCompact, { backgroundColor: c.bg, paddingTop: Math.max(insets.top, 8), paddingBottom: Math.max(insets.bottom, 10) }]}>
      <AdminCommandBar
        value={q}
        onChangeText={setQ}
        placeholder="Buscar producto, marca, categoría o comercio"
        actions={[
          { label: "Editar tarjeta", icon: "options-outline", onPress: () => setConfigOpen(true) },
          { label: "Importar", icon: "cloud-upload-outline", onPress: pickExcel, disabled: importMut.isPending },
          { label: "Exportar", icon: "download-outline", onPress: () => exportToExcel(products) },
        ]}
      />

      {isFetching && products.length > 0 ? <View style={styles.refreshingBar}><ActivityIndicator size="small" /><Text style={[styles.refreshingText, { color: c.muted }]}>Actualizando...</Text></View> : null}

      {isLoading && !products.length ? <View style={styles.center}><ActivityIndicator /></View> : error ? (
        <View style={styles.center}><Text style={{ color: c.danger }}>{t("backendErrorTitle")}</Text></View>
      ) : (
        <FlatList
          data={filtered}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refreshAdminList} />}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 14, paddingBottom: Math.max(insets.bottom, 16) + 72 }}
          renderItem={({ item }) => (
            <Pressable style={[styles.catalogCard, { backgroundColor: c.card, borderColor: c.border }]} onPress={() => openEdit(item)}>
              <View style={[styles.productMedia, { backgroundColor: c.bg, borderColor: c.border }]}>
                {item.fotoProducto ? <CachedImage uri={item.fotoProducto} style={styles.productImage} resizeMode="cover" /> : <Ionicons name="cube-outline" size={28} color={c.muted} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.cardHeaderLine}>
                  <Text numberOfLines={1} style={[styles.rowTitle, { color: c.text }]}>{item.nombre || "Producto sin nombre"}</Text>
                  <View style={[styles.statusDot, { backgroundColor: item.fotoProducto ? "#16a34a" : "#f59e0b" }]} />
                </View>
                <Text numberOfLines={1} style={[styles.rowSub, { color: c.muted }]}>{item.fabricanteMarca || "Sin marca"}</Text>
                <Text numberOfLines={1} style={[styles.rowStore, { color: c.primary }]}>{item.tienda || "Sin comercio"}</Text>
                <View style={styles.productTags}>
                  {!!item.catGeneral && <Text style={[styles.productTag, { backgroundColor: `${c.primary}12`, color: c.primary }]}>{item.catGeneral}</Text>}
                  {!!item.sello && <Text style={[styles.productTag, { backgroundColor: c.bg, color: c.muted }]}>{item.sello}</Text>}
                </View>
              </View>
              <View style={styles.rowActions}>
                <Pressable onPress={() => openEdit(item)} style={[styles.actionChip, { borderColor: c.border }]}><Ionicons name="create-outline" size={18} color={c.text} /></Pressable>
                <Pressable onPress={() => onDelete(item)} disabled={deleteMut.isPending} style={[styles.actionChip, { borderColor: c.border, opacity: deleteMut.isPending ? 0.55 : 1 }]}><Ionicons name="trash-outline" size={18} color={c.danger} /></Pressable>
              </View>
            </Pressable>
          )}
        />
      )}

      <SafeFormModal visible={configOpen} onRequestClose={() => setConfigOpen(false)} backgroundColor={c.bg}>
          <ScrollView
            style={{ flex: 1, backgroundColor: c.bg }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ padding: 16, paddingTop: Math.max(insets.top, 12), paddingBottom: 24 + Math.max(insets.bottom, 16) }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}><Text style={{ fontSize: 20, fontWeight: "900", color: c.text }}>Tarjeta productos</Text></View>
              <Pressable onPress={() => setConfigOpen(false)}><Ionicons name="close" size={22} color={c.text} /></Pressable>
            </View>
            {heroDraft ? (
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Field label="Título ES" value={heroDraft.titleEs} onChange={(v) => setHeroDraft((s) => s ? { ...s, titleEs: v } : s)} />
                <Field label="Título EN" value={heroDraft.titleEn} onChange={(v) => setHeroDraft((s) => s ? { ...s, titleEn: v } : s)} />
                <Field label="Subtítulo ES" value={heroDraft.subtitleEs ?? ""} onChange={(v) => setHeroDraft((s) => s ? { ...s, subtitleEs: v } : s)} />
                <Field label="Subtítulo EN" value={heroDraft.subtitleEn ?? ""} onChange={(v) => setHeroDraft((s) => s ? { ...s, subtitleEn: v } : s)} />
                <Field label="Imagen URL" value={heroDraft.imageUrl} onChange={(v) => setHeroDraft((s) => s ? { ...s, imageUrl: v } : s)} />
                <Field label="Botón principal ES" value={heroDraft.primaryButtonEs} onChange={(v) => setHeroDraft((s) => s ? { ...s, primaryButtonEs: v } : s)} />
                <Field label="Botón principal EN" value={heroDraft.primaryButtonEn} onChange={(v) => setHeroDraft((s) => s ? { ...s, primaryButtonEn: v } : s)} />
                <Field label="URL principal" value={heroDraft.primaryUrl} onChange={(v) => setHeroDraft((s) => s ? { ...s, primaryUrl: v } : s)} />
                <Field label="Botón secundario ES" value={heroDraft.secondaryButtonEs ?? ""} onChange={(v) => setHeroDraft((s) => s ? { ...s, secondaryButtonEs: v } : s)} />
                <Field label="Botón secundario EN" value={heroDraft.secondaryButtonEn ?? ""} onChange={(v) => setHeroDraft((s) => s ? { ...s, secondaryButtonEn: v } : s)} />
                <Field label="URL secundaria" value={heroDraft.secondaryUrl ?? ""} onChange={(v) => setHeroDraft((s) => s ? { ...s, secondaryUrl: v } : s)} />
                <Text style={[styles.fieldLabel, { color: c.text }]}>Elementos visibles</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  {[
                    ["showImage", "Imagen"],
                    ["showTitle", "Título"],
                    ["showSubtitle", "Subtítulo"],
                    ["showPrimaryButton", "Botón principal"],
                    ["showSecondaryButton", "Botón secundario"],
                  ].map(([key, label]) => {
                    const active = (heroDraft as any)[key] !== false;
                    return <Pressable key={key} onPress={() => setHeroDraft((s) => s ? ({ ...s, [key]: active ? false : true }) : s)} style={[styles.filterPill, { backgroundColor: active ? c.primary : c.bg, borderColor: c.border }]}><Text style={{ color: active ? c.primaryText : c.text, fontWeight: "700" }}>{label}</Text></Pressable>;
                  })}
                </View>
                <Text style={[styles.fieldLabel, { color: c.text }]}>Filtros visibles</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {["tienda","sello","certifica","catGeneral","categoria1","atributo1","atributo2","atributo3"].map((key) => {
                    const active = heroDraft.visibleFilters.includes(key);
                    return <Pressable key={key} onPress={() => setHeroDraft((s) => s ? { ...s, visibleFilters: active ? s.visibleFilters.filter((x) => x !== key) : [...s.visibleFilters, key] } : s)} style={[styles.filterPill, { backgroundColor: active ? c.primary : c.bg, borderColor: c.border }]}><Text style={{ color: active ? c.primaryText : c.text, fontWeight: "700" }}>{key}</Text></Pressable>;
                  })}
                </View>
                <Pressable onPress={() => setHeroDraft((s) => s ? { ...s, activo: !s.activo } : s)} style={[styles.topBtn, { borderColor: c.border, marginTop: 14, alignSelf: "flex-start" }]}><Text style={[styles.topBtnText, { color: c.text }]}>{heroDraft.activo ? "Visible" : "Oculta"}</Text></Pressable>
                <Pressable style={[styles.saveBtn, { backgroundColor: c.primary, marginTop: 16, opacity: saveHeroMut.isPending ? 0.7 : 1 }]} onPress={() => heroDraft && saveHeroMut.mutate(heroDraft)} disabled={saveHeroMut.isPending}><Text style={{ color: c.primaryText, fontWeight: "900" }}>{saveHeroMut.isPending ? t("saving") : t("save")}</Text></Pressable>
              </View>
            ) : <ActivityIndicator />}
          </ScrollView>
      </SafeFormModal>

      <SafeFormModal visible={modalOpen} onRequestClose={() => setModalOpen(false)} backgroundColor={c.bg}>
          <View style={{ flex: 1, backgroundColor: c.bg }}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 12) }]}>
              <View style={styles.modalHeaderMain}>
                <Text style={{ fontSize: 20, fontWeight: "900", color: c.text }}>{mode === "create" ? t("newProduct") : t("editProduct")}</Text>
                <Text style={{ color: c.muted, fontWeight: "700", marginTop: 2 }}>{t("requiredFieldsProductsMsg")}</Text>
              </View>
              <View style={styles.modalHeaderActions}>
                <Pressable onPress={() => setModalOpen(false)} style={[styles.closeBtn, { borderColor: c.border, backgroundColor: c.card }]}>
                  <Ionicons name="close" size={20} color={c.text} />
                </Pressable>
              </View>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{ padding: 16, paddingBottom: 24 + Math.max(insets.bottom, 16) }}
            >
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.cardTitle, { color: c.text }]}>{t("basicInfo")}</Text>
                <Text style={[styles.formHint, { color: c.muted }]}>Primero completa el nombre del producto, luego marca, categoría y comercio. Así el formulario es más rápido de llenar.</Text>
                <Field label={`${t("nombre")} (ES)`} value={form.nombre} onChange={(v) => setForm((s) => ({ ...s, nombre: v }))} />
                <Field label={`${t("nombre")} (EN)`} value={form.nombreEn ?? ""} onChange={(v) => setForm((s) => ({ ...s, nombreEn: v }))} />
                <CreatableSelect label={`${t("fabricanteMarca")} (ES)`} value={form.fabricanteMarca} options={opts.fabricanteMarca.es} onChange={(v: string) => setForm((s) => ({ ...s, fabricanteMarca: v }))} />
                <CreatableSelect label={`${t("fabricanteMarca")} (EN)`} value={form.fabricanteMarcaEn ?? ""} options={opts.fabricanteMarca.en} onChange={(v: string) => setForm((s) => ({ ...s, fabricanteMarcaEn: v }))} />
                <CreatableSelect label={`${t("catGeneral")} (ES)`} value={form.catGeneral} options={opts.catGeneral.es} onChange={(v: string) => setForm((s) => ({ ...s, catGeneral: v }))} />
                <CreatableSelect label={`${t("catGeneral")} (EN)`} value={form.catGeneralEn ?? ""} options={opts.catGeneral.en} onChange={(v: string) => setForm((s) => ({ ...s, catGeneralEn: v }))} />
                <CreatableSelect label={`${t("categoria1")} (ES)`} value={form.categoria1} options={opts.categoria1.es} onChange={(v: string) => setForm((s) => ({ ...s, categoria1: v }))} />
                <CreatableSelect label={`${t("categoria1")} (EN)`} value={form.categoria1En ?? ""} options={opts.categoria1.en} onChange={(v: string) => setForm((s) => ({ ...s, categoria1En: v }))} />
                <CreatableSelect label={`${t("tienda")} (ES)`} value={form.tienda ?? ""} options={storeOptionsEs} allowEmpty onChange={(v: string) => setForm((s) => ({ ...s, tienda: v }))} />
                <CreatableSelect label={`${t("tienda")} (EN)`} value={form.tiendaEn ?? ""} options={storeOptionsEn} allowEmpty onChange={(v: string) => setForm((s) => ({ ...s, tiendaEn: v }))} />
              </View>

              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.cardTitle, { color: c.text }]}>{t("certification")}</Text>
                <CreatableSelect label={`${t("certificaOptional")} (ES)`} value={form.certifica ?? ""} options={opts.certifica.es} allowEmpty onChange={(v: string) => setForm((s) => ({ ...s, certifica: v }))} />
                <CreatableSelect label={`${t("certificaOptional")} (EN)`} value={form.certificaEn ?? ""} options={opts.certifica.en} allowEmpty onChange={(v: string) => setForm((s) => ({ ...s, certificaEn: v }))} />
                <SealValueSelect label={`${t("selloOptional")} (ES)`} value={form.sello ?? ""} imageValue={form.fotoSello1 ?? form.fotoSello2 ?? ""} options={existingSealOptions} language="es" creating={createSealMut.isPending} onCreateSeal={createSealFromPicker} onPick={(option) => setForm((s) => ({ ...s, sello: option.valueEs, selloEn: s.selloEn || option.valueEn || s.selloEn, fotoSello1: option.imageUrl || s.fotoSello1 }))} onManualChange={(v) => setForm((s) => ({ ...s, sello: v }))} />
                <SealValueSelect label={`${t("selloOptional")} (EN)`} value={form.selloEn ?? ""} imageValue={form.fotoSello1 ?? form.fotoSello2 ?? ""} options={existingSealOptions} language="en" creating={createSealMut.isPending} onCreateSeal={createSealFromPicker} onPick={(option) => setForm((s) => ({ ...s, selloEn: option.valueEn || option.valueEs, sello: s.sello || option.valueEs || s.sello, fotoSello1: option.imageUrl || s.fotoSello1 }))} onManualChange={(v) => setForm((s) => ({ ...s, selloEn: v }))} />



                <View style={[styles.sealPhotoSection, { borderColor: c.border, backgroundColor: c.bg }]}>
                  <View style={styles.sealPhotoHeader}>
                    <Ionicons name="images-outline" size={18} color={c.text} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: c.text, marginBottom: 4 }]}>Imágenes del sello</Text>
                      <Text style={{ color: c.muted, fontSize: 12, lineHeight: 18, fontWeight: "700" }}>Sello/Autoriza llena automáticamente Fotografía Sello 1. Si necesitas una segunda imagen, usa Sello/Autoriza 2 para llenar Fotografía Sello 2 con el mismo catálogo de sellos.</Text>
                    </View>
                  </View>
                  <SealLinkedPhotoSelect
                    label="Sello/Autoriza 2"
                    value={secondarySealLabel}
                    imageValue={form.fotoSello2 ?? ""}
                    options={existingSealOptions}
                    creating={createSealMut.isPending}
                    onCreateSeal={createSealFromPicker}
                    onPick={(option) => {
                      setSecondarySealLabel(option.valueEs || option.valueEn || "");
                      setForm((s) => ({ ...s, fotoSello2: option.imageUrl || s.fotoSello2 }));
                    }}
                    onManualChange={(nextLabel) => setSecondarySealLabel(nextLabel)}
                    onManualImageChange={(nextImage) => setForm((s) => ({ ...s, fotoSello2: nextImage }))}
                    helperText="Opcional. Úsalo solo cuando quieras mostrar una segunda variante del sello."
                  />
                </View>
              </View>

              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.cardTitle, { color: c.text }]}>{t("attributes")}</Text>
                <CreatableSelect label={`${t("atributo1")} (ES)`} value={form.atributo1 ?? ""} options={opts.atributo1.es} allowEmpty onChange={(v: string) => setForm((s) => ({ ...s, atributo1: v }))} />
                <CreatableSelect label={`${t("atributo1")} (EN)`} value={form.atributo1En ?? ""} options={opts.atributo1.en} allowEmpty onChange={(v: string) => setForm((s) => ({ ...s, atributo1En: v }))} />
                <CreatableSelect label={`${t("atributo2")} (ES)`} value={form.atributo2 ?? ""} options={opts.atributo2.es} allowEmpty onChange={(v: string) => setForm((s) => ({ ...s, atributo2: v }))} />
                <CreatableSelect label={`${t("atributo2")} (EN)`} value={form.atributo2En ?? ""} options={opts.atributo2.en} allowEmpty onChange={(v: string) => setForm((s) => ({ ...s, atributo2En: v }))} />
                <CreatableSelect label={`${t("atributo3")} (ES)`} value={form.atributo3 ?? ""} options={opts.atributo3.es} allowEmpty onChange={(v: string) => setForm((s) => ({ ...s, atributo3: v }))} />
                <CreatableSelect label={`${t("atributo3")} (EN)`} value={form.atributo3En ?? ""} options={opts.atributo3.en} allowEmpty onChange={(v: string) => setForm((s) => ({ ...s, atributo3En: v }))} />
                <ImagePickerUpload
                  label="Foto producto"
                  value={form.fotoProducto ?? ""}
                  onChange={(v) => setForm((s) => ({ ...s, fotoProducto: v }))}
                  folder="kosher-costa-rica/productos"
                  textColor={c.text}
                  mutedColor={c.muted}
                  borderColor={c.border}
                  backgroundColor={c.bg}
                  inputStyle={styles.input}
                  labelStyle={styles.fieldLabel}
                />
                <Pressable style={[styles.saveBtn, { backgroundColor: c.primary, opacity: savingProduct ? 0.7 : 1 }]} onPress={onSave} disabled={savingProduct}><Text style={{ color: c.primaryText, fontWeight: "900" }}>{savingProduct ? t("saving") : t("save")}</Text></Pressable>
              </View>
            </ScrollView>
            <AdminSavingOverlay visible={savingProduct || createSealMut.isPending} label={createSealMut.isPending ? "Guardando sello..." : "Guardando producto..."} />
          </View>
      </SafeFormModal>
      <AdminFloatingActionButton icon="add-outline" label="Nuevo" onPress={openCreate} bottom={Math.max(insets.bottom, 16) + 18} />
    </View>
  );
}


function SealValueSelect({
  label,
  value,
  imageValue,
  options,
  language,
  creating,
  onCreateSeal,
  onPick,
  onManualChange,
}: {
  label: string;
  value: string;
  imageValue?: string;
  options: ExistingSealOption[];
  language: "es" | "en";
  creating: boolean;
  onCreateSeal: (payload: { nombreEs: string; nombreEn?: string; imageUrl: string }) => Promise<ExistingSealOption>;
  onPick: (option: ExistingSealOption) => void;
  onManualChange: (value: string) => void;
}) {
  const selectedOption = useMemo(() => {
    const key = normalizeOption(value);
    return options.find((option) => normalizeOption(language === "en" ? (option.valueEn || option.valueEs) : (option.valueEs || option.valueEn)) === key) ?? null;
  }, [options, language, value]);
  return (
    <SealPickerSelect
      label={label}
      value={value}
      imageValue={imageValue}
      options={options}
      selectedOption={selectedOption}
      language={language}
      creating={creating}
      onCreateSeal={onCreateSeal}
      onPick={onPick}
      onManualChange={onManualChange}
    />
  );
}

function SealLinkedPhotoSelect({
  label,
  value,
  imageValue,
  options,
  creating,
  onCreateSeal,
  onPick,
  onManualChange,
  onManualImageChange,
  helperText,
}: {
  label: string;
  value: string;
  imageValue?: string;
  options: ExistingSealOption[];
  creating: boolean;
  onCreateSeal: (payload: { nombreEs: string; nombreEn?: string; imageUrl: string }) => Promise<ExistingSealOption>;
  onPick: (option: ExistingSealOption) => void;
  onManualChange: (value: string) => void;
  onManualImageChange: (value: string) => void;
  helperText?: string;
}) {
  const { palette: c } = useTheme();
  const [draftImage, setDraftImage] = React.useState("");

  React.useEffect(() => {
    setDraftImage("");
  }, [value, imageValue]);

  const selectedOption = useMemo(() => {
    const key = normalizeOption(value);
    return options.find((option) => normalizeOption(option.valueEs || option.valueEn) === key) ?? null;
  }, [options, value]);

  return (
    <View style={styles.sealBlock}>
      <SealPickerSelect
        label={label}
        value={value}
        imageValue={draftImage || imageValue}
        options={options}
        selectedOption={selectedOption}
        language="es"
        creating={creating}
        onCreateSeal={onCreateSeal}
        onPick={(option) => {
          onPick(option);
          if (option.imageUrl) onManualImageChange(option.imageUrl);
        }}
        onManualChange={onManualChange}
      />
      {helperText ? <Text style={{ color: c.muted, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 2, marginBottom: 8 }}>{helperText}</Text> : null}
      <Text style={[styles.fieldLabel, { color: c.text, marginTop: helperText ? 0 : 2 }]}>URL manual para Fotografía Sello 2</Text>
      <View style={styles.newSealRow}>
        <TextInput
          value={draftImage}
          onChangeText={setDraftImage}
          placeholder="Pegá aquí la URL manual"
          placeholderTextColor={c.muted}
          style={[styles.input, styles.newSealInput, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={() => {
            const next = draftImage.trim();
            if (!next) return;
            onManualImageChange(next);
          }}
          style={[styles.addSealBtn, { backgroundColor: draftImage.trim() ? c.primary : c.border }]}
          disabled={!draftImage.trim()}
        >
          <Ionicons name="add" size={18} color={draftImage.trim() ? c.primaryText : c.muted} />
        </Pressable>
      </View>
    </View>
  );
}

function SealPickerSelect({
  label,
  value,
  imageValue,
  options,
  selectedOption,
  language,
  creating,
  onCreateSeal,
  onPick,
  onManualChange,
}: {
  label: string;
  value: string;
  imageValue?: string;
  options: ExistingSealOption[];
  selectedOption: ExistingSealOption | null;
  language: "es" | "en";
  creating: boolean;
  onCreateSeal: (payload: { nombreEs: string; nombreEn?: string; imageUrl: string }) => Promise<ExistingSealOption>;
  onPick: (option: ExistingSealOption) => void;
  onManualChange: (value: string) => void;
}) {
  const { palette: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [nameEs, setNameEs] = React.useState("");
  const [nameEn, setNameEn] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [localSaving, setLocalSaving] = React.useState(false);

  const display = value?.trim() ? value.trim() : "";
  const previewUri = selectedOption?.imageUrl || String(imageValue ?? "").trim();
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const unique = new Map<string, ExistingSealOption>();
    for (const option of options) {
      const labelValue = language === "en" ? (option.valueEn || option.valueEs) : (option.valueEs || option.valueEn);
      if (!labelValue) continue;
      unique.set(normalizeOption(labelValue), option);
    }
    const arr = Array.from(unique.values());
    return s ? arr.filter((option) => `${option.valueEs} ${option.valueEn}`.toLowerCase().includes(s)) : arr;
  }, [options, q, language]);

  const close = () => {
    setOpen(false);
    setQ("");
    setShowCreate(false);
    setNameEs("");
    setNameEn("");
    setImageUrl("");
  };

  const saveNew = async () => {
    const primaryName = (language === "en" ? nameEn || nameEs : nameEs || nameEn).trim();
    if (!primaryName || !imageUrl.trim()) {
      Alert.alert("Sello incompleto", "Agrega el nombre del sello y su imagen.");
      return;
    }
    try {
      setLocalSaving(true);
      const option = await onCreateSeal({ nombreEs: nameEs.trim() || nameEn.trim(), nombreEn: nameEn.trim() || nameEs.trim(), imageUrl: imageUrl.trim() });
      onPick(option);
      close();
    } catch (e: any) {
      Alert.alert("No se pudo guardar el sello", e?.response?.data?.message ?? "Revisa los datos del sello.");
    } finally {
      setLocalSaving(false);
    }
  };

  return (
    <View style={styles.sealBlock}>
      <Text style={[styles.fieldLabel, { color: c.text }]}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={[styles.sealPickerTrigger, { backgroundColor: c.bg, borderColor: c.border }]}>
        <View style={[styles.sealPickerMiniMedia, { backgroundColor: c.card, borderColor: c.border }]}>
          {previewUri ? <CachedImage uri={previewUri} style={styles.sealPickerMiniImage} resizeMode="contain" /> : <Ionicons name="ribbon-outline" size={20} color={c.muted} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: display ? c.text : c.muted, fontWeight: "900" }} numberOfLines={1}>{display || "Seleccionar sello"}</Text>
          <Text style={{ color: c.muted, fontSize: 12, fontWeight: "700", marginTop: 2 }} numberOfLines={1}>Toca para elegir o agregar un nuevo sello</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={c.muted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close} statusBarTranslucent={false} presentationStyle="fullScreen">
        <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom + 12, 20), paddingTop: Math.max(insets.top + 18, 36) }}>
            <View style={styles.sealModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontSize: 20, fontWeight: "900" }}>{label}</Text>
                <Text style={{ color: c.muted, fontSize: 12, fontWeight: "700", marginTop: 2 }}>Selecciona un sello o crea uno nuevo aquí mismo.</Text>
              </View>
              <Pressable onPress={close} hitSlop={10} style={[styles.closeBtn, { borderColor: c.border, backgroundColor: c.card }]}>
                <Ionicons name="close" size={20} color={c.text} />
              </Pressable>
            </View>

            <View style={[styles.searchShell, { backgroundColor: c.card, borderColor: c.border, marginTop: 12, marginBottom: 12 }]}>
              <Ionicons name="search" size={18} color={c.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Buscar sello" placeholderTextColor={c.muted} style={{ flex: 1, color: c.text, fontWeight: "700" }} />
            </View>

            <Pressable onPress={() => setShowCreate((v) => !v)} style={[styles.inlineCreateSealBtn, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={[styles.inlineCreateSealIcon, { backgroundColor: `${c.primary}18` }]}>
                <Ionicons name={showCreate ? "remove" : "add"} size={20} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inlineCreateSealTitle, { color: c.text }]}>Agregar nuevo sello</Text>
                <Text style={[styles.inlineCreateSealCopy, { color: c.muted }]}>Crea el sello sin salir de esta selección.</Text>
              </View>
            </Pressable>

            {showCreate ? (
              <View style={[styles.newSealBox, { borderColor: c.border, backgroundColor: c.card }]}>
                <Field label="Nombre sello (ES)" value={nameEs} onChange={setNameEs} />
                <Field label="Nombre sello (EN)" value={nameEn} onChange={setNameEn} />
                <ImagePickerUpload label="Imagen del sello" value={imageUrl} onChange={setImageUrl} folder="kosher-costa-rica/sellos" textColor={c.text} mutedColor={c.muted} borderColor={c.border} backgroundColor={c.bg} inputStyle={styles.input} labelStyle={styles.fieldLabel} />
                <Pressable onPress={saveNew} disabled={creating || localSaving} style={[styles.addSealWideBtn, { backgroundColor: creating || localSaving ? c.border : c.primary }]}>
                  {creating || localSaving ? <ActivityIndicator size="small" color={c.muted} /> : <Ionicons name="checkmark-circle-outline" size={18} color={c.primaryText} />}
                  <Text style={{ color: creating || localSaving ? c.muted : c.primaryText, fontWeight: "900" }}>{creating || localSaving ? "Guardando sello..." : "Guardar y seleccionar"}</Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={[styles.fieldLabel, { color: c.text, marginTop: 8 }]}>Sellos disponibles</Text>
            <FlatList
              data={filtered}
              keyExtractor={(item, index) => `${item.valueEs || item.valueEn}-${index}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => {
                const itemLabel = language === "en" ? (item.valueEn || item.valueEs) : (item.valueEs || item.valueEn);
                const selected = normalizeOption(itemLabel) === normalizeOption(value);
                return (
                  <Pressable onPress={() => { onPick(item); close(); }} style={[styles.sealOptionRow, { backgroundColor: selected ? `${c.primary}14` : c.card, borderColor: selected ? c.primary : c.border }]}>
                    <View style={[styles.sealOptionMedia, { backgroundColor: c.bg, borderColor: c.border }]}>
                      {item.imageUrl ? <CachedImage uri={item.imageUrl} style={styles.sealOptionImage} resizeMode="contain" /> : <Ionicons name="ribbon-outline" size={20} color={c.muted} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: c.text, fontWeight: "900" }} numberOfLines={1}>{itemLabel}</Text>
                      {!!item.valueEn && !!item.valueEs ? <Text style={{ color: c.muted, fontSize: 12, fontWeight: "700", marginTop: 2 }} numberOfLines={1}>{item.valueEs} / {item.valueEn}</Text> : null}
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={c.primary} /> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text style={{ color: c.muted, fontWeight: "700", paddingVertical: 16 }}>Sin sellos disponibles.</Text>}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {previewUri ? (
        <View style={[styles.sealPreviewCard, { backgroundColor: c.bg, borderColor: c.border }]}> 
          <View style={styles.sealPreviewMedia}><CachedImage uri={previewUri} style={styles.sealPreviewImage} resizeMode="contain" /></View>
          <View style={styles.sealPreviewInfo}>
            <Text style={[styles.fieldLabel, { color: c.text, marginBottom: 6 }]}>Sello seleccionado</Text>
            <Text style={{ color: c.text, fontWeight: "800", marginBottom: 4 }}>{display || "Sin seleccionar"}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}


function Field({ label, value, onChange }: FieldProps) {
  const { palette: c } = useTheme();
  return <View style={{ marginBottom: 12 }}><Text style={[styles.fieldLabel, { color: c.text }]}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholderTextColor={c.muted} style={[styles.input, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]} /></View>;
}

const styles = StyleSheet.create({
  rootCompact: { },
  topBarCompact: { alignItems: "flex-start", flexWrap: "wrap", paddingHorizontal: 12 },
  topActionsCompact: { width: "100%", flexWrap: "wrap", justifyContent: "flex-start" },
  h1Compact: { fontSize: 22, lineHeight: 27, flexShrink: 1 },
  footerCompact: { flexDirection: "column" },
  modalBtnCompact: { minHeight: 48 },

  root: { flex: 1, backgroundColor: "#f8fafc" }, topBar: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }, h1: { fontSize: 28, fontWeight: "900" },
  summaryCard: { marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderRadius: 28, padding: 18, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryMain: { flex: 1 },
  summaryTitle: { fontSize: 16, fontWeight: "900" },
  summaryCopy: { marginTop: 4, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  summaryBadge: { minWidth: 74, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 10, alignItems: "center" },
  summaryBadgeText: { fontSize: 18, fontWeight: "900" },
  summaryBadgeLabel: { marginTop: 2, fontSize: 11, fontWeight: "700" },
  topActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 14 },
  topBtn: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "rgba(255,255,255,0.88)" },
  topBtnText: { fontWeight: "900", fontSize: 12 }, addBtn: { width: 52, minHeight: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", shadowColor: "#0f172a", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  modalHeader: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, backgroundColor: "#fff", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0" },
  modalHeaderMain: { flex: 1, paddingTop: 2 },
  modalHeaderActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 10, paddingTop: 2, maxWidth: "52%" },
  utilityBtn: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexShrink: 1 },
  utilityBtnText: { fontWeight: "800", fontSize: 12, flexShrink: 1 },
  closeBtn: { width: 42, height: 42, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 }, searchShell: { minHeight: 54, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#0f172a", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, search: { flex: 1, minHeight: 52, fontSize: 14, fontWeight: "700" }, refreshingBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 6 }, refreshingText: { fontSize: 12, fontWeight: "800" }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", borderWidth: 1, borderRadius: 22, padding: 16, marginBottom: 14, shadowColor: "#0f172a", shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  catalogCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 30, padding: 14, marginBottom: 14, shadowColor: "#0f172a", shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 3 },
  productMedia: { width: 68, height: 68, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  productImage: { width: "100%", height: "100%" },
  productTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  productTag: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: "900" },
  cardHeaderLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  rowTitle: { flex: 1, fontSize: 16, fontWeight: "900", letterSpacing: -0.2 }, rowSub: { fontSize: 12, marginTop: 5, lineHeight: 18, fontWeight: "700" }, rowStore: { fontSize: 12, marginTop: 2, fontWeight: "900" }, rowActions: { flexDirection: "column", gap: 8, marginLeft: 2 },
  actionChip: { minWidth: 42, minHeight: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.9)" }, card: { borderWidth: 1, borderRadius: 28, padding: 18, marginBottom: 16, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 }, cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 12 },
  formHint: { fontSize: 12, lineHeight: 18, fontWeight: "700", marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "900", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }, input: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, minHeight: 52, fontWeight: "700" }, newSealBox: { borderWidth: 1, borderRadius: 24, padding: 14, marginBottom: 14 }, inlineCreateSealBtn: { minHeight: 66, borderWidth: 1, borderRadius: 22, padding: 12, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 12 }, inlineCreateSealIcon: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center" }, inlineCreateSealTitle: { fontSize: 13, fontWeight: "900" }, inlineCreateSealCopy: { marginTop: 2, fontSize: 11, lineHeight: 16, fontWeight: "700" }, addSealWideBtn: { minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 4 }, sealPhotoSection: { borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 12 }, sealPhotoHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 }, sealBlock: { marginBottom: 12 }, sealPreviewCard: { borderWidth: 1, borderRadius: 18, padding: 12, marginTop: 10, flexDirection: "row", gap: 12, alignItems: "center" }, sealPreviewMedia: { width: 88, height: 88 }, sealPreviewImage: { width: "100%", height: "100%", borderRadius: 14, backgroundColor: "#fff" }, sealPreviewEmpty: { width: "100%", height: "100%", borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 8 }, sealPreviewInfo: { flex: 1 },
  sealPickerTrigger: { minHeight: 64, borderWidth: 1, borderRadius: 18, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  sealPickerMiniMedia: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sealPickerMiniImage: { width: "100%", height: "100%" },
  sealModalHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  sealOptionRow: { minHeight: 72, borderWidth: 1, borderRadius: 20, padding: 10, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  sealOptionMedia: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sealOptionImage: { width: "100%", height: "100%" },
  newSealRow: { flexDirection: "row", alignItems: "center", gap: 10 }, newSealInput: { flex: 1 }, addSealBtn: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 1 }, saveBtn: { alignItems: "center", justifyContent: "center", borderRadius: 20, paddingVertical: 17, shadowColor: "#0f172a", shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 }, filterPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
});
