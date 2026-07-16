import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList, TextInput, Alert, ActivityIndicator,
  RefreshControl,
  Linking, ScrollView, useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/auth/authStore";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeFormModal from "@/components/layout/SafeFormModal";
import { useDebouncedValue } from "@/features/admin/hooks/useDebouncedValue";
import { AdminCommandBar, AdminFloatingActionButton, AdminSavingOverlay } from "@/features/admin/components/AdminExperience";
import ImagePickerUpload from "@/components/ImagePickerUpload";
import CachedImage from "@/components/CachedImage";
import { translateField } from "@/features/admin/utils/bilingualAutofill";
import { listRestaurants, type AdminRestaurant } from "@/features/admin/api/adminRestaurantsApi";
import { listNews, createNews, updateNews, deleteNews, type AdminNews } from "@/features/admin/api/adminNewsApi";

type Mode = "create" | "edit";
type Destino = "NOVEDADES" | "ANUNCIANTES";

export default function AdminNewsScreen() {
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
  const [editing, setEditing] = useState<AdminNews | null>(null);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [destino, setDestino] = useState<Destino>("NOVEDADES");
  const [activo, setActivo] = useState(true);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [restauranteId, setRestauranteId] = useState<number | null>(null);

  const { data: news = [], isLoading, isFetching, error } = useQuery({ queryKey: ["admin-news"], queryFn: listNews, enabled: hydrated && isAdmin && !!token, retry: 1, staleTime: 120_000, gcTime: 15 * 60_000, refetchOnMount: false, refetchOnWindowFocus: false });
  const { data: restaurants = [] } = useQuery({ queryKey: ["admin-restaurants"], queryFn: listRestaurants, enabled: hydrated && isAdmin && !!token, retry: 1, staleTime: 120_000, gcTime: 15 * 60_000, refetchOnMount: false, refetchOnWindowFocus: false });

  const filtered = useMemo(() => {
    const s = debouncedQ.trim().toLowerCase();
    if (!s) return news;
    return news.filter((n: any) =>
      `${n.titulo} ${n.contenido ?? ""} ${n.destino ?? ""} ${n.restaurante?.nombreEs ?? ""}`.toLowerCase().includes(s)
    );
  }, [news, debouncedQ]);

  const restaurantOptions = useMemo(() => restaurants.filter((x) => x.activo !== false).map((r) => ({
    id: r.id,
    label: r.nombreEs,
  })), [restaurants]);

  const resetForm = () => {
    setTitulo(""); setContenido(""); setImageUrl(""); setFileUrl("");
    setDestino("NOVEDADES"); setActivo(true); setNotifyUsers(true); setRestauranteId(null); setEditing(null); setMode("create");
  };

  const openCreate = () => { resetForm(); setMode("create"); setModalOpen(true); };
  const openEdit = (n: AdminNews) => {
    setMode("edit"); setEditing(n); setTitulo(n.titulo ?? ""); setContenido(n.contenido ?? "");
    setImageUrl(n.imageUrl ?? ""); setFileUrl(n.fileUrl ?? ""); setDestino((n.destino as Destino) ?? "NOVEDADES");
    setActivo(n.activo ?? true); setNotifyUsers(n.notifyUsers ?? true); setRestauranteId(n.restauranteId ?? n.restaurante?.id ?? null); setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const refreshAdminList = React.useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["admin-news"] });
  }, [qc]);

  const createMut = useMutation({
    mutationFn: createNews,
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["admin-news"] }); closeModal(); resetForm(); Alert.alert("Listo", "Elemento creado."); },
    onError: (e: any) => Alert.alert("Error", e?.response?.data?.message ?? "No se pudo crear."),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateNews(id, payload),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["admin-news"] }); closeModal(); resetForm(); Alert.alert("Listo", "Elemento actualizado."); },
    onError: (e: any) => Alert.alert("Error", e?.response?.data?.message ?? "No se pudo actualizar."),
  });
  const deleteMut = useMutation({
    mutationFn: deleteNews,
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["admin-news"] }); Alert.alert("Listo", "Elemento eliminado."); },
    onError: (e: any) => Alert.alert("Error", e?.response?.data?.message ?? "No se pudo eliminar."),
  });

  const onSave = () => {
    const payload: any = { destino, activo, notifyUsers, restauranteId: destino === "ANUNCIANTES" ? restauranteId : null };
    payload.titulo = titulo.trim() || t("untitled");
    if (contenido.trim()) payload.contenido = contenido.trim();
    if (imageUrl.trim()) payload.imageUrl = imageUrl.trim();
    if (fileUrl.trim()) payload.fileUrl = fileUrl.trim();
    if (savingNews) return;
    if (mode === "create") createMut.mutate(payload);
    else if (editing) updateMut.mutate({ id: editing.id, payload });
  };

  const autoTranslateContent = async () => {
    if (!contenido.trim()) return;
    const translated = await translateField(contenido);
    Alert.alert("Referencia", "Traducción sugerida al inglés generada en caché para usarla en frontend.");
    console.log("translated preview", translated);
  };

  const savingNews = createMut.isPending || updateMut.isPending;

  const onDelete = (item: AdminNews) => {
    if (deleteMut.isPending) return;
    Alert.alert("¿Estás seguro?", "¿Deseas eliminar este registro?", [
      { text: "No", style: "cancel" },
      { text: "Sí", style: "destructive", onPress: () => deleteMut.mutate(item.id) },
    ]);
  };

  if (!hydrated) return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator /></View>;

  if (!isAdmin) return <View style={[styles.center, { backgroundColor: c.bg }]}><Text style={{ color: c.text }}>{t("adminOnly")}</Text></View>;

  return (
    <View style={[styles.root, compact && styles.rootCompact, { backgroundColor: c.bg, paddingTop: Math.max(insets.top, 8), paddingBottom: Math.max(insets.bottom, 10) }]}>
      <AdminCommandBar value={q} onChangeText={setQ} placeholder="Buscar título, contenido, destino o comercio" />

      {isFetching && news.length > 0 ? <View style={styles.refreshingBar}><ActivityIndicator size="small" /><Text style={[styles.refreshingText, { color: c.muted }]}>Actualizando...</Text></View> : null}

      {isLoading && !news.length ? <View style={styles.center}><ActivityIndicator /></View> : error ? (
        <View style={styles.center}><Text style={{ color: c.danger, fontWeight: "900" }}>{t("errorLoad")}</Text></View>
      ) : (
        <FlatList
          data={filtered}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refreshAdminList} />}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          keyExtractor={(i: any) => String(i.id)}
          contentContainerStyle={{ padding: 14, paddingBottom: Math.max(insets.bottom, 16) + 72 }}
          renderItem={({ item }: any) => {
            const itemDestino: Destino = item.destino ?? "NOVEDADES";
            return (
              <Pressable style={[styles.crmCard, { backgroundColor: c.card, borderColor: c.border, opacity: item.activo === false ? 0.6 : 1 }]} onPress={() => openEdit(item)}>
                <View style={styles.newsCardTop}>
                  <View style={[styles.newsMedia, { backgroundColor: c.bg, borderColor: c.border }]}>
                    {item.imageUrl ? <CachedImage uri={item.imageUrl} style={styles.newsImage} resizeMode="cover" /> : <Ionicons name="newspaper-outline" size={26} color={c.muted} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.inlineRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={[styles.cardTitleText, { color: c.text }]}>{item.titulo?.trim() ? item.titulo : "Novedad sin título"}</Text>
                        <Text numberOfLines={1} style={[styles.cardSubText, { color: c.muted }]}>{itemDestino === "ANUNCIANTES" ? "Anunciante" : "Novedades"}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: item.activo === false ? "#991b1b" : "#166534" }]}>
                        <Text style={styles.statusBadgeText}>{item.activo === false ? "Oculto" : "Visible"}</Text>
                      </View>
                    </View>
                    <Text style={[styles.cardMetaText, { color: c.muted }]} numberOfLines={1}>{item.restaurante?.nombreEs || item.contenido || "Sin descripción"}</Text>
                  </View>
                </View>
                <View style={styles.rowActions}>
                  <Pressable onPress={() => updateMut.mutate({ id: item.id, payload: { activo: !(item.activo ?? true) } })} style={[styles.smallBtn, { borderColor: c.border }]}>
                    <Ionicons name={item.activo === false ? "eye-outline" : "eye-off-outline"} size={16} color={c.text} />
                  </Pressable>
                  <Pressable onPress={() => openEdit(item)} style={[styles.smallBtn, { borderColor: c.border }]}>
                    <Ionicons name="create-outline" size={16} color={c.text} />
                  </Pressable>
                  <Pressable onPress={() => onDelete(item)} disabled={deleteMut.isPending} style={[styles.smallBtn, { borderColor: c.border, opacity: deleteMut.isPending ? 0.55 : 1 }]}>
                    <Ionicons name="trash-outline" size={18} color={c.danger} />
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <SafeFormModal visible={modalOpen} onRequestClose={closeModal} backgroundColor={c.bg}>
            <View style={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: "900", color: c.text }}>{mode === "create" ? t("newPost") : t("editPost")}</Text>
              </View>
              <Pressable onPress={closeModal} hitSlop={10} style={[styles.closeBtn, { borderColor: c.border, backgroundColor: c.card }]}><Ionicons name="close" size={20} color={c.text} /></Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{ padding: 16, paddingBottom: 24 + Math.max(insets.bottom, 16) }}
            >
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.label, { color: c.muted }]}>Estado</Text>
                <Pressable onPress={() => setActivo((v) => !v)} style={[styles.switchBtn, { backgroundColor: activo ? "#166534" : "#991b1b" }]}><Text style={{ color: "#fff", fontWeight: "900" }}>{activo ? "Visible" : "Oculto"}</Text></Pressable>

                <Text style={[styles.label, { color: c.muted }]}>{t("notifyUsers")}</Text>
                <Pressable onPress={() => setNotifyUsers((v) => !v)} style={[styles.notifyRow, { backgroundColor: c.bg, borderColor: c.border }]}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ color: c.text, fontWeight: "900" }}>{notifyUsers ? (t("all") ? t("notifyUsers") : "Notificar") : t("notifyUsers")}</Text>
                    <Text style={{ color: c.muted, marginTop: 4, fontSize: 12, lineHeight: 18 }}>{t("notifyUsersHelp")}</Text>
                  </View>
                  <View style={[styles.notifyBadge, { backgroundColor: notifyUsers ? c.primary : c.card, borderColor: c.border }]}>
                    <Text style={{ color: notifyUsers ? c.primaryText : c.text, fontWeight: "900" }}>{notifyUsers ? "ON" : "OFF"}</Text>
                  </View>
                </Pressable>

                <Text style={[styles.label, { color: c.muted }]}>{t("destination")}</Text>
                <View style={[styles.segment, { backgroundColor: c.bg, borderColor: c.border }]}>
                  <Pressable onPress={() => { setDestino("NOVEDADES"); setRestauranteId(null); }} style={[styles.segmentBtn, destino === "NOVEDADES" ? { backgroundColor: c.primary } : null]}><Text style={{ color: destino === "NOVEDADES" ? c.primaryText : c.text, fontWeight: "900" }}>{t("news")}</Text></Pressable>
                  <Pressable onPress={() => setDestino("ANUNCIANTES")} style={[styles.segmentBtn, destino === "ANUNCIANTES" ? { backgroundColor: c.primary } : null]}><Text style={{ color: destino === "ANUNCIANTES" ? c.primaryText : c.text, fontWeight: "900" }}>{t("advertisers")}</Text></Pressable>
                </View>

                {destino === "ANUNCIANTES" ? (
                  <>
                    <Text style={[styles.label, { color: c.muted }]}>Restaurante relacionado</Text>
                    <View style={[styles.segment, { backgroundColor: c.bg, borderColor: c.border, flexWrap: "wrap", padding: 8 }]}>
                      {restaurantOptions.map((item) => {
                        const active = restauranteId === item.id;
                        return (
                          <Pressable key={item.id} onPress={() => setRestauranteId(item.id)} style={[styles.pill, { backgroundColor: active ? c.primary : c.card, borderColor: c.border }]}>
                            <Text style={{ color: active ? c.primaryText : c.text, fontWeight: "700" }}>{item.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                <Text style={[styles.label, { color: c.muted }]}>{t("title")} ({t("optional")})</Text>
                <TextInput value={titulo} onChangeText={setTitulo} style={[styles.field, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]} placeholderTextColor={c.muted} placeholder={t("title")} />

                <Text style={[styles.label, { color: c.muted }]}>Contenido</Text>
                <TextInput value={contenido} onChangeText={setContenido} multiline style={[styles.field, styles.area, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]} placeholderTextColor={c.muted} placeholder="Texto principal" />

                <ImagePickerUpload
                  label="URL imagen"
                  value={imageUrl}
                  onChange={setImageUrl}
                  folder="kosher-costa-rica/novedades"
                  textColor={c.text}
                  mutedColor={c.muted}
                  borderColor={c.border}
                  backgroundColor={c.bg}
                  inputStyle={styles.field}
                  labelStyle={styles.label}
                />

                <Text style={[styles.label, { color: c.muted }]}>URL adjunto</Text>
                <TextInput value={fileUrl} onChangeText={setFileUrl} style={[styles.field, { backgroundColor: c.bg, borderColor: c.border, color: c.text }]} placeholderTextColor={c.muted} placeholder="https://..." />
              </View>

              <View style={[styles.inlineFooter, compact && styles.inlineFooterCompact]}>
                <Pressable style={[styles.secondaryBtn, compact && styles.modalBtnCompact, { borderColor: c.border }]} onPress={closeModal}>
                  <Text style={{ color: c.text, fontWeight: "900" }}>{t("cancel")}</Text>
                </Pressable>
                <Pressable style={[styles.primaryBtn, compact && styles.modalBtnCompact, { backgroundColor: c.primary, opacity: savingNews ? 0.7 : 1 }]} onPress={onSave} disabled={savingNews}>
                  <Text style={{ color: c.primaryText, fontWeight: "900" }}>{savingNews ? "Guardando..." : t("save")}</Text>
                </Pressable>
              </View>
            </ScrollView>
            <AdminSavingOverlay visible={savingNews} label="Guardando novedad..." />
      </SafeFormModal>
      <AdminFloatingActionButton icon="add-outline" label="Nuevo" onPress={openCreate} bottom={Math.max(insets.bottom, 16) + 18} />
    </View>
  );
}

const styles = StyleSheet.create({
  rootCompact: { },
  topBarCompact: { alignItems: "flex-start", flexWrap: "wrap", paddingHorizontal: 12 },
  topActionsCompact: { width: "100%", flexWrap: "wrap", justifyContent: "flex-start" },
  h1Compact: { fontSize: 22, lineHeight: 27, flexShrink: 1 },
  footerCompact: { flexDirection: "column" },
  inlineFooterCompact: { flexDirection: "column" },
  modalBtnCompact: { minHeight: 50 },

  root: { flex: 1, backgroundColor: "#f8fafc" }, refreshingBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 6 }, refreshingText: { fontSize: 12, fontWeight: "800" }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, gap: 12 },
  summaryCard: { marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderRadius: 28, padding: 18, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryMain: { flex: 1 },
  summaryTitle: { fontSize: 16, fontWeight: "900" },
  summaryCopy: { marginTop: 4, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  summaryBadge: { minWidth: 72, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 10, alignItems: "center" },
  summaryBadgeText: { fontSize: 18, fontWeight: "900" },
  summaryBadgeLabel: { marginTop: 2, fontSize: 11, fontWeight: "700" },
  h1: { fontSize: 28, fontWeight: "900" }, addBtn: { width: 52, minHeight: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", shadowColor: "#0f172a", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }, searchShell: { minHeight: 54, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#0f172a", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, search: { flex: 1, minHeight: 52, fontSize: 14, fontWeight: "700" },
  row: { borderWidth: 1, borderRadius: 22, padding: 16, marginBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 12, shadowColor: "#0f172a", shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  crmCard: { borderWidth: 1, borderRadius: 30, padding: 14, marginBottom: 14, shadowColor: "#0f172a", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  newsCardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  newsMedia: { width: 68, height: 68, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  newsImage: { width: "100%", height: "100%" },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitleText: { fontSize: 15, fontWeight: "900" },
  cardSubText: { marginTop: 2, fontWeight: "700" },
  cardMetaText: { marginTop: 6, fontSize: 12, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  statusBadgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  smallBtn: { minWidth: 42, minHeight: 42, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.9)" },
  card: { borderWidth: 1, borderRadius: 28, padding: 18, shadowColor: "#0f172a", shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 }, label: { marginBottom: 8, marginTop: 14, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  field: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, minHeight: 52, fontWeight: "700" }, area: { minHeight: 128, height: 128, textAlignVertical: "top", paddingTop: 14 },
  segment: { borderWidth: 1, borderRadius: 18, padding: 5, flexDirection: "row", gap: 8, backgroundColor: "rgba(255,255,255,0.8)" }, segmentBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  footer: { flexDirection: "row", gap: 12, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }, inlineFooter: { flexDirection: "row", gap: 12, marginTop: 14 }, primaryBtn: { flex: 1, minHeight: 54, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 12, shadowColor: "#0f172a", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 }, secondaryBtn: { flex: 1, minHeight: 54, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "rgba(255,255,255,0.88)" },
  switchBtn: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  notifyRow: { marginTop: 2, borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center" },
  notifyBadge: { minWidth: 62, height: 38, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  ghostBtn: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.9)" },
  closeBtn: { width: 42, height: 42, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, margin: 4, backgroundColor: "rgba(255,255,255,0.85)" },
});
