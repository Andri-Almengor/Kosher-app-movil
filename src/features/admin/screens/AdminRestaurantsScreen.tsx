import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, Alert, ScrollView, useWindowDimensions, ActivityIndicator, RefreshControl } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/auth/authStore";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { AppFonts } from "@/theme/fonts";
import { CreatableSelect } from "@/components/CreatableSelect";
import ImagePickerUpload from "@/components/ImagePickerUpload";
import CachedImage from "@/components/CachedImage";
import { resolveOptionTranslation, translateField } from "@/features/admin/utils/bilingualAutofill";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeFormModal from "@/components/layout/SafeFormModal";
import { useDebouncedValue } from "@/features/admin/hooks/useDebouncedValue";
import { AdminCommandBar, AdminFloatingActionButton, AdminSavingOverlay } from "@/features/admin/components/AdminExperience";
import { listNews, updateNews } from "@/features/admin/api/adminNewsApi";
import { syncAllIfOnline } from "@/offline/sync";
import {
  listRestaurants,
  listRestaurantOptions,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  createRestaurantNameOption,
  createRestaurantTypeOption,
  type AdminRestaurant,
} from "@/features/admin/api/adminRestaurantsApi";

type Mode = "create" | "edit";
const emptyForm = {
  imageUrl: "",
  nombreEs: "",
  nombreEn: "",
  tipoEs: "",
  tipoEn: "",
  ubicacionEs: "",
  ubicacionEn: "",
  acercaDeEs: "",
  acercaDeEn: "",
  horarioEs: "",
  horarioEn: "",
  telefono: "",
  descripTelefonoEs: "",
  descripTelefonoEn: "",
  whatsapp: "",
  descripWhatsappEs: "",
  descripWhatsappEn: "",
  correo: "",
  descripCorreoEs: "",
  descripCorreoEn: "",
  contactoEs: "",
  contactoEn: "",
  direccionEs: "",
  direccionEn: "",
  direccionLink: "",
  activo: true,
};

function byLocale(a: string, b: string) {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

export default function AdminRestaurantsScreen() {
  const { t } = useI18n();
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
  const [mode, setMode] = useState<Mode>("create");
  const [editing, setEditing] = useState<AdminRestaurant | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: items = [], isLoading, isFetching, error } = useQuery({ queryKey: ["admin-restaurants"], queryFn: listRestaurants, enabled: hydrated && isAdmin && !!token, retry: 1, staleTime: 120_000, gcTime: 15 * 60_000, refetchOnMount: false, refetchOnWindowFocus: false });
  const { data: options } = useQuery({ queryKey: ["admin-restaurants-options"], queryFn: listRestaurantOptions, enabled: hydrated && isAdmin && !!token, retry: 1, staleTime: 120_000, gcTime: 15 * 60_000, refetchOnMount: false, refetchOnWindowFocus: false });

  const filtered = useMemo(() => {
    const s = debouncedQ.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => [x.nombreEs, x.nombreEn, x.tipoEs, x.tipoEn, x.ubicacionEs, x.ubicacionEn].map((v) => String(v ?? "").toLowerCase()).join(" ").includes(s));
  }, [items, debouncedQ]);

  const mergeUnique = React.useCallback((values: Array<string | null | undefined>) => {
    const map = new Map<string, string>();
    for (const raw of values) {
      const value = String(raw ?? "").trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (!map.has(key)) map.set(key, value);
    }
    return Array.from(map.values()).sort(byLocale);
  }, []);

  const namesEs = useMemo(() => mergeUnique([
    ...(options?.nombres ?? []).map((x) => x.nombreEs),
    ...items.map((x) => x.nombreEs),
    form.nombreEs,
  ]), [options, items, form.nombreEs, mergeUnique]);
  const namesEn = useMemo(() => mergeUnique([
    ...(options?.nombres ?? []).map((x) => x.nombreEn || x.nombreEs),
    ...items.map((x) => x.nombreEn || x.nombreEs),
    form.nombreEn,
  ]), [options, items, form.nombreEn, mergeUnique]);
  const typesEs = useMemo(() => mergeUnique([
    ...(options?.tipos ?? []).map((x) => x.nombreEs),
    ...items.map((x) => x.tipoEs),
    form.tipoEs,
  ]), [options, items, form.tipoEs, mergeUnique]);
  const typesEn = useMemo(() => mergeUnique([
    ...(options?.tipos ?? []).map((x) => x.nombreEn || x.nombreEs),
    ...items.map((x) => x.tipoEn || x.tipoEs),
    form.tipoEn,
  ]), [options, items, form.tipoEn, mergeUnique]);

  const reset = () => { setForm({ ...emptyForm }); setEditing(null); setMode("create"); };
  const openCreate = () => { reset(); setModalOpen(true); };

  const cascadeHideRelatedNews = async (restaurantId: number) => {
    const news = await listNews();
    const relatedVisibleNews = (news ?? []).filter((item: any) => {
      const rawRestaurantId = item?.restauranteId ?? item?.restaurante?.id;
      return Number(rawRestaurantId) === Number(restaurantId) && item?.activo !== false;
    });

    if (!relatedVisibleNews.length) return 0;

    await Promise.all(
      relatedVisibleNews.map((item) =>
        updateNews(item.id, {
          activo: false,
        })
      )
    );

    return relatedVisibleNews.length;
  };

  const cascadeShowRelatedNews = async (restaurantId: number) => {
    const news = await listNews();
    const relatedHiddenNews = (news ?? []).filter((item: any) => {
      const rawRestaurantId = item?.restauranteId ?? item?.restaurante?.id;
      return Number(rawRestaurantId) === Number(restaurantId) && item?.activo === false;
    });

    if (!relatedHiddenNews.length) return 0;

    await Promise.all(
      relatedHiddenNews.map((item) =>
        updateNews(item.id, {
          activo: true,
        })
      )
    );

    return relatedHiddenNews.length;
  };

  const syncPublicOfflineCache = async () => {
    try {
      await syncAllIfOnline(() => {});
    } catch {}
  };
  const openEdit = (item: AdminRestaurant) => {
    setEditing(item); setMode("edit"); setForm({
      imageUrl: item.imageUrl ?? "",
      nombreEs: item.nombreEs ?? "",
      nombreEn: item.nombreEn ?? "",
      tipoEs: item.tipoEs ?? "",
      tipoEn: item.tipoEn ?? "",
      ubicacionEs: item.ubicacionEs ?? "",
      ubicacionEn: item.ubicacionEn ?? "",
      acercaDeEs: item.acercaDeEs ?? "",
      acercaDeEn: item.acercaDeEn ?? "",
      horarioEs: item.horarioEs ?? "",
      horarioEn: item.horarioEn ?? "",
      telefono: item.telefono ?? item.telefonoRaw ?? "",
      descripTelefonoEs: item.descripTelefonoEs ?? "",
      descripTelefonoEn: item.descripTelefonoEn ?? "",
      whatsapp: item.whatsapp ?? item.whatsappRaw ?? "",
      descripWhatsappEs: item.descripWhatsappEs ?? "",
      descripWhatsappEn: item.descripWhatsappEn ?? "",
      correo: item.correo ?? item.correoRaw ?? "",
      descripCorreoEs: item.descripCorreoEs ?? "",
      descripCorreoEn: item.descripCorreoEn ?? "",
      contactoEs: item.contactoEs ?? "",
      contactoEn: item.contactoEn ?? "",
      direccionEs: item.direccionEs ?? "",
      direccionEn: item.direccionEn ?? "",
      direccionLink: item.direccionLink ?? "",
      activo: item.activo ?? true,
    });
    setModalOpen(true);
  };

  const refreshAdminList = React.useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
  }, [qc]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
    await qc.invalidateQueries({ queryKey: ["admin-restaurants-options"] });
    await qc.invalidateQueries({ queryKey: ["admin-news"] });
  };

  const refreshRestaurantOptions = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-restaurants-options"] });
    await qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
  };

  const createNameOption = async (value: string, locale: "es" | "en") => {
    const v = value.trim();
    if (!v) return;
    if (locale === "es") await createRestaurantNameOption({ nombreEs: v, nombreEn: form.nombreEn || undefined });
    else await createRestaurantNameOption({ nombreEs: form.nombreEs || v, nombreEn: v });
    await refreshRestaurantOptions();
  };

  const createTypeOption = async (value: string, locale: "es" | "en") => {
    const v = value.trim();
    if (!v) return;
    if (locale === "es") await createRestaurantTypeOption({ nombreEs: v, nombreEn: form.tipoEn || undefined });
    else await createRestaurantTypeOption({ nombreEs: form.tipoEs || v, nombreEn: v });
    await refreshRestaurantOptions();
  };

  const createMut = useMutation({ mutationFn: createRestaurant, onSuccess: async () => { await invalidate(); await syncPublicOfflineCache(); setModalOpen(false); reset(); Alert.alert(t("done"), t("restaurantSaved")); }, onError: (e: any) => Alert.alert(t("error"), e?.response?.data?.message ?? t("couldNotSaveRestaurant")) });
  const updateMut = useMutation({ mutationFn: async ({ id, payload, cascadeHideNews, cascadeShowNews }: { id: number; payload: any; cascadeHideNews?: boolean; cascadeShowNews?: boolean }) => {
    const result = await updateRestaurant(id, payload);
    let hiddenNewsCount = 0;
    let shownNewsCount = 0;
    if (cascadeHideNews) {
      hiddenNewsCount = await cascadeHideRelatedNews(id);
    }
    if (cascadeShowNews) {
      shownNewsCount = await cascadeShowRelatedNews(id);
    }
    return { result, hiddenNewsCount, shownNewsCount };
  }, onSuccess: async (data) => { await invalidate(); await syncPublicOfflineCache(); setModalOpen(false); reset(); Alert.alert(t("done"), data?.hiddenNewsCount ? `${t("restaurantUpdated")}

${t("relatedNewsHidden").replace("{{count}}", String(data.hiddenNewsCount))}` : data?.shownNewsCount ? `${t("restaurantUpdated")}

${t("relatedNewsShown").replace("{{count}}", String(data.shownNewsCount))}` : t("restaurantUpdated")); }, onError: (e: any) => Alert.alert(t("error"), e?.response?.data?.message ?? t("couldNotSaveRestaurant")) });
  const deleteMut = useMutation({ mutationFn: deleteRestaurant, onSuccess: async () => { await invalidate(); await syncPublicOfflineCache(); Alert.alert(t("done"), t("restaurantDeleted")); }, onError: (e: any) => Alert.alert(t("error"), e?.response?.data?.message ?? t("couldNotDelete")) });

  const autoFillEnglish = async () => {
    try {
      const [nombreEn, tipoEn, ubicacionEn, acercaDeEn, horarioEn, descripTelefonoEn, descripWhatsappEn, descripCorreoEn, direccionEn] = await Promise.all([
        form.nombreEn || !form.nombreEs ? Promise.resolve(form.nombreEn) : resolveOptionTranslation(form.nombreEs, options?.nombres ?? []),
        form.tipoEn || !form.tipoEs ? Promise.resolve(form.tipoEn) : resolveOptionTranslation(form.tipoEs, options?.tipos ?? []),
        form.ubicacionEn || !form.ubicacionEs ? Promise.resolve(form.ubicacionEn) : translateField(form.ubicacionEs),
        form.acercaDeEn || !form.acercaDeEs ? Promise.resolve(form.acercaDeEn) : translateField(form.acercaDeEs),
        form.horarioEn || !form.horarioEs ? Promise.resolve(form.horarioEn) : translateField(form.horarioEs),
        form.descripTelefonoEn || !form.descripTelefonoEs ? Promise.resolve(form.descripTelefonoEn) : translateField(form.descripTelefonoEs),
        form.descripWhatsappEn || !form.descripWhatsappEs ? Promise.resolve(form.descripWhatsappEn) : translateField(form.descripWhatsappEs),
        form.descripCorreoEn || !form.descripCorreoEs ? Promise.resolve(form.descripCorreoEn) : translateField(form.descripCorreoEs),
        form.direccionEn || !form.direccionEs ? Promise.resolve(form.direccionEn) : translateField(form.direccionEs),
      ]);
      setForm((s) => ({ ...s, nombreEn: nombreEn || "", tipoEn: tipoEn || "", ubicacionEn: ubicacionEn || "", acercaDeEn: acercaDeEn || "", horarioEn: horarioEn || "", descripTelefonoEn: descripTelefonoEn || "", descripWhatsappEn: descripWhatsappEn || "", descripCorreoEn: descripCorreoEn || "", direccionEn: direccionEn || "" }));
      Alert.alert(t("done"), t("englishFieldsAutofilled"));
    } catch {
      Alert.alert(t("error"), t("englishFieldsAutofillError"));
    }
  };

  const save = () => {
    if (createMut.isPending || updateMut.isPending) return;
    if (!form.nombreEs.trim() || !form.tipoEs.trim()) return Alert.alert(t("error"), t("restaurantRequiredFields"));
    const payload = { ...form, ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? String(v ?? "").trim() || null : v])) };
    if (mode === "create") createMut.mutate(payload as any);
    else if (editing) updateMut.mutate({
      id: editing.id,
      payload,
      cascadeHideNews: editing.activo !== false && payload.activo === false,
      cascadeShowNews: editing.activo === false && payload.activo !== false,
    });
  };

  const savingRestaurant = createMut.isPending || updateMut.isPending;

  if (!isAdmin) return <View style={[styles.center, { backgroundColor: c.bg }]}><Text style={{ color: c.text }}>{t("adminOnly")}</Text></View>;

  return (
    <View style={[styles.root, compact && styles.rootCompact, { backgroundColor: c.bg, paddingTop: Math.max(insets.top, 8), paddingBottom: Math.max(insets.bottom, 10) }]}>
      <AdminCommandBar value={q} onChangeText={setQ} placeholder="Buscar comercio, ubicación o categoría" />
      {isFetching && items.length > 0 ? <View style={styles.refreshingBar}><ActivityIndicator size="small" /><Text style={[styles.refreshingText, { color: c.muted }]}>Actualizando...</Text></View> : null}

      {isLoading && !items.length ? <View style={styles.center}><ActivityIndicator /></View> : error ? <View style={styles.center}><Text style={{ color: c.danger, fontWeight: "900", textAlign: "center" }}>{t("errorLoad")}</Text></View> : <FlatList
        data={filtered}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refreshAdminList} />}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 72 }}
        renderItem={({ item }) => (
          <Pressable style={[styles.crmCard, { backgroundColor: c.card, borderColor: c.border, opacity: item.activo === false ? 0.6 : 1 }]} onPress={() => openEdit(item)}>
            <View style={styles.restaurantCardTop}>
              <View style={[styles.restaurantMedia, { backgroundColor: c.bg, borderColor: c.border }]}>
                {item.imageUrl ? <CachedImage uri={item.imageUrl} style={styles.restaurantImage} resizeMode="cover" /> : <Ionicons name="storefront-outline" size={26} color={c.muted} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.inlineRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[styles.cardTitle, { color: c.text }]}>{item.nombreEs || "Comercio sin nombre"}</Text>
                    <Text numberOfLines={1} style={[styles.cardSub, { color: c.muted }]}>{item.tipoEs || "Sin categoría"}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: item.activo === false ? "#991b1b" : "#166534" }]}>
                    <Text style={styles.badgeText}>{item.activo === false ? t("hiddenLabel") : t("visibleLabel")}</Text>
                  </View>
                </View>
                <Text style={[styles.cardMeta, { color: c.muted }]} numberOfLines={1}>{item.ubicacionEs || item.direccionEs || "Sin ubicación"}</Text>
              </View>
            </View>
            <View style={styles.rowActions}>
              <Pressable onPress={() => updateMut.mutate({ id: item.id, payload: { activo: !(item.activo ?? true) }, cascadeHideNews: (item.activo ?? true) !== false, cascadeShowNews: item.activo === false })} style={[styles.smallBtn, { borderColor: c.border }]}>
                <Ionicons name={item.activo === false ? "eye-outline" : "eye-off-outline"} size={16} color={c.text} />
              </Pressable>
              <Pressable onPress={() => openEdit(item)} style={[styles.smallBtn, { borderColor: c.border }]}>
                <Ionicons name="create-outline" size={16} color={c.text} />
              </Pressable>
              <Pressable onPress={() => Alert.alert("¿Estás seguro?", "¿Deseas eliminar este registro?", [{ text: "No", style: "cancel" }, { text: "Sí", style: "destructive", onPress: () => deleteMut.mutate(item.id) }])} disabled={deleteMut.isPending} style={[styles.smallBtn, { borderColor: c.border, opacity: deleteMut.isPending ? 0.55 : 1 }]}>
                <Ionicons name="trash-outline" size={18} color={c.danger} />
              </Pressable>
            </View>
          </Pressable>
        )}
      />}

      <SafeFormModal visible={modalOpen} onRequestClose={() => setModalOpen(false)} backgroundColor={c.bg}>
        <View style={[styles.modalRoot, { backgroundColor: c.bg, paddingTop: Math.max(insets.top, 10) }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderMain}>
              <Text numberOfLines={2} adjustsFontSizeToFit style={[styles.h1, compact && styles.h1Compact, { color: c.text }]}>{mode === "create" ? t("newRestaurant") : t("editRestaurant")}</Text>
              <Text style={[styles.modalCopy, { color: c.muted }]}>{t("restaurantsAutofillCopy")}</Text>
            </View>
            <View style={styles.modalHeaderActions}>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={10} style={[styles.closeBtn, { borderColor: c.border, backgroundColor: c.card }]}>
                <Ionicons name="close" size={20} color={c.text} />
              </Pressable>
            </View>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 28 + Math.max(insets.bottom, 16) }}
          >
            <View style={styles.inlineRow}>
              <Text style={[styles.section, { color: c.text, flex: 1 }]}>{t("languageLabel")}</Text>
              <Pressable onPress={() => setForm((s) => ({ ...s, activo: !s.activo }))} style={[styles.toggleBtn, { backgroundColor: form.activo ? "#166534" : "#991b1b" }]}>
                <Text style={styles.badgeText}>{form.activo ? t("visibleLabel") : t("hiddenLabel")}</Text>
              </Pressable>
            </View>
            <CreatableSelect label={t("restaurantNameEs")} value={form.nombreEs} options={namesEs} createLabel="Agregar nuevo nombre" onCreateValue={(v) => createNameOption(v, "es")} onChange={(v) => setForm((s) => ({ ...s, nombreEs: String(v ?? "") }))} />
            <CreatableSelect label={t("restaurantNameEn")} value={form.nombreEn} options={namesEn} createLabel="Agregar nuevo nombre" onCreateValue={(v) => createNameOption(v, "en")} onChange={(v) => setForm((s) => ({ ...s, nombreEn: String(v ?? "") }))} />
            <CreatableSelect label={t("businessTypeEs")} value={form.tipoEs} options={typesEs} createLabel="Agregar nuevo tipo de comercio" onCreateValue={(v) => createTypeOption(v, "es")} onChange={(v) => setForm((s) => ({ ...s, tipoEs: String(v ?? "") }))} />
            <CreatableSelect label={t("businessTypeEn")} value={form.tipoEn} options={typesEn} createLabel="Agregar nuevo tipo de comercio" onCreateValue={(v) => createTypeOption(v, "en")} onChange={(v) => setForm((s) => ({ ...s, tipoEn: String(v ?? "") }))} />
            <ImagePickerUpload
              label={t("restaurantImage")}
              value={form.imageUrl}
              onChange={(v) => setForm((s) => ({ ...s, imageUrl: v }))}
              folder="kosher-costa-rica/restaurantes"
              textColor={c.text}
              mutedColor={c.muted}
              borderColor={c.border}
              backgroundColor={c.card}
            />
            <Input label={t("locationEs")} value={form.ubicacionEs} onChangeText={(v) => setForm((s) => ({ ...s, ubicacionEs: v }))} />
            <Input label={t("locationEn")} value={form.ubicacionEn} onChangeText={(v) => setForm((s) => ({ ...s, ubicacionEn: v }))} />
            <Input label={t("aboutEs")} value={form.acercaDeEs} onChangeText={(v) => setForm((s) => ({ ...s, acercaDeEs: v }))} multiline />
            <Input label={t("aboutEn")} value={form.acercaDeEn} onChangeText={(v) => setForm((s) => ({ ...s, acercaDeEn: v }))} multiline />
            <Input label={t("businessHoursEs")} value={form.horarioEs} onChangeText={(v) => setForm((s) => ({ ...s, horarioEs: v }))} multiline />
            <Input label={t("businessHoursEn")} value={form.horarioEn} onChangeText={(v) => setForm((s) => ({ ...s, horarioEn: v }))} multiline />
            <Input label={t("phoneValueLabel")} value={form.telefono} onChangeText={(v) => setForm((s) => ({ ...s, telefono: v }))} />
            <Input label={t("phoneDescriptionEs")} value={form.descripTelefonoEs} onChangeText={(v) => setForm((s) => ({ ...s, descripTelefonoEs: v }))} multiline />
            <Input label={t("phoneDescriptionEn")} value={form.descripTelefonoEn} onChangeText={(v) => setForm((s) => ({ ...s, descripTelefonoEn: v }))} multiline />
            <Input label={t("whatsappValueLabel")} value={form.whatsapp} onChangeText={(v) => setForm((s) => ({ ...s, whatsapp: v }))} />
            <Input label={t("whatsappDescriptionEs")} value={form.descripWhatsappEs} onChangeText={(v) => setForm((s) => ({ ...s, descripWhatsappEs: v }))} multiline />
            <Input label={t("whatsappDescriptionEn")} value={form.descripWhatsappEn} onChangeText={(v) => setForm((s) => ({ ...s, descripWhatsappEn: v }))} multiline />
            <Input label={t("emailValueLabel")} value={form.correo} onChangeText={(v) => setForm((s) => ({ ...s, correo: v }))} />
            <Input label={t("emailDescriptionEs")} value={form.descripCorreoEs} onChangeText={(v) => setForm((s) => ({ ...s, descripCorreoEs: v }))} multiline />
            <Input label={t("emailDescriptionEn")} value={form.descripCorreoEn} onChangeText={(v) => setForm((s) => ({ ...s, descripCorreoEn: v }))} multiline />
            <Input label={t("addressEs")} value={form.direccionEs} onChangeText={(v) => setForm((s) => ({ ...s, direccionEs: v }))} multiline />
            <Input label={t("addressEn")} value={form.direccionEn} onChangeText={(v) => setForm((s) => ({ ...s, direccionEn: v }))} multiline />
            <Input label={t("addressLink")} value={form.direccionLink} onChangeText={(v) => setForm((s) => ({ ...s, direccionLink: v }))} />

            <View style={styles.actions}>
              <Pressable style={[styles.actionBtn, { borderColor: c.border }]} onPress={() => setModalOpen(false)}>
                <Text style={{ color: c.text, fontWeight: "900" }}>{t("cancel")}</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, { backgroundColor: c.primary, opacity: savingRestaurant ? 0.7 : 1 }]} onPress={save} disabled={savingRestaurant}>
                <Text style={{ color: c.primaryText, fontWeight: "900" }}>{savingRestaurant ? t("saving") : t("save")}</Text>
              </Pressable>
            </View>
          </ScrollView>
          <AdminSavingOverlay visible={savingRestaurant} label="Guardando comercio..." />
        </View>
      </SafeFormModal>
      <AdminFloatingActionButton icon="add-outline" label="Nuevo" onPress={openCreate} bottom={Math.max(insets.bottom, 16) + 18} />
    </View>
  );
}

function Input({ label, multiline, ...props }: any) {
  const { palette: c } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      <TextInput multiline={multiline} placeholderTextColor={c.muted} style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card, minHeight: multiline ? 96 : 46, textAlignVertical: multiline ? "top" : "center" }]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  rootCompact: { },
  topBarCompact: { alignItems: "flex-start", flexWrap: "wrap", paddingHorizontal: 12 },
  topActionsCompact: { width: "100%", flexWrap: "wrap", justifyContent: "flex-start" },
  h1Compact: { fontSize: 22, lineHeight: 27, flexShrink: 1 },
  footerCompact: { flexDirection: "column" },
  modalBtnCompact: { minHeight: 48 },

  smallActionBtn: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  root: { flex: 1, backgroundColor: "#f8fafc" },
  refreshingBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 6 },
  refreshingText: { fontSize: 12, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, gap: 12, flexWrap: "wrap" },
  summaryCard: { marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderRadius: 28, padding: 18, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryMain: { flex: 1 },
  summaryTitle: { fontSize: 16, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
  summaryCopy: { marginTop: 4, fontSize: 12, lineHeight: 18, fontFamily: AppFonts.poppinsRegular },
  summaryBadge: { minWidth: 72, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 10, alignItems: "center" },
  summaryBadgeText: { fontSize: 18, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
  summaryBadgeLabel: { marginTop: 2, fontSize: 11, fontFamily: AppFonts.poppinsRegular },
  h1: { fontSize: 22, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
  addBtn: { width: 52, minHeight: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", shadowColor: "#0f172a", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 }, searchShell: { minHeight: 54, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#0f172a", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, search: { flex: 1, minHeight: 52, fontFamily: AppFonts.poppinsRegular, fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 28, padding: 18, marginBottom: 14, shadowColor: "#0f172a", shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  crmCard: { borderWidth: 1, borderRadius: 30, padding: 14, marginBottom: 14, shadowColor: "#0f172a", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  restaurantCardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  restaurantMedia: { width: 68, height: 68, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  restaurantImage: { width: "100%", height: "100%" },
  cardTitle: { fontSize: 15, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
  cardSub: { marginTop: 2, fontFamily: AppFonts.poppinsRegular },
  cardMeta: { marginTop: 6, fontSize: 12, fontFamily: AppFonts.poppinsRegular },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  smallBtn: { minWidth: 42, minHeight: 42, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.9)" },
  modalRoot: { flex: 1 },
  modalHeader: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 14, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, backgroundColor: "#fff", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0" },
  modalHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "54%" },
  closeBtn: { width: 42, height: 42, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalHeaderMain: { flex: 1, paddingTop: 2 },
  modalCopy: { marginTop: 4, fontSize: 12, lineHeight: 18, fontFamily: AppFonts.poppinsRegular },
  smallActionText: { fontSize: 12, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
  section: { fontSize: 15, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", marginBottom: 14 },
  label: { marginBottom: 8, fontSize: 12, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  input: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, fontFamily: AppFonts.poppinsRegular, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 12, paddingTop: 8, marginTop: 8 },
  actionBtn: { flex: 1, minHeight: 54, alignItems: "center", justifyContent: "center", paddingVertical: 14, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
});
