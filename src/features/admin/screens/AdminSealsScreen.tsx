import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CachedImage } from "@/components/CachedImage";
import ImagePickerUpload from "@/components/ImagePickerUpload";
import {
  AdminCommandBar,
  AdminFloatingActionButton,
  AdminMiniStatRow,
  AdminModuleHero,
  AdminSavingOverlay,
} from "@/features/admin/components/AdminExperience";
import {
  createAdminProductSeal,
  deleteAdminProductSeal,
  listAdminProductSeals,
  syncExistingProductSeals,
  updateAdminProductSeal,
  type ProductSealOption,
} from "@/features/admin/api/adminProductsApi";
import { useTheme } from "@/theme/ThemeProvider";

const emptyDraft = {
  nombreEs: "",
  nombreEn: "",
  imageUrl: "",
  activo: true,
};

type Draft = typeof emptyDraft;

function sealName(item: ProductSealOption) {
  return String(item.nombreEs ?? item.valueEs ?? item.nombreEn ?? item.valueEn ?? "").trim();
}

function sealNameEn(item: ProductSealOption) {
  return String(item.nombreEn ?? item.valueEn ?? item.nombreEs ?? item.valueEs ?? "").trim();
}

function sealImage(item: ProductSealOption) {
  return String(item.imageUrl ?? "").trim();
}

export default function AdminSealsScreen() {
  const { palette: c } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductSealOption | null>(null);
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft });

  const sealsQ = useQuery({
    queryKey: ["admin-product-seals", "all"],
    queryFn: () => listAdminProductSeals({ includeInactive: true }),
    staleTime: 60_000,
  });

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-product-seals"] }),
      qc.invalidateQueries({ queryKey: ["admin-products"] }),
    ]);
  };

  const createMut = useMutation({
    mutationFn: createAdminProductSeal,
    onSuccess: async () => {
      await invalidate();
      closeModal();
      Alert.alert("Sello creado", "El sello quedó disponible para todos los productos.");
    },
    onError: (error: any) => Alert.alert("No se pudo crear", error?.response?.data?.message ?? "Revisa los datos del sello."),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Draft }) => updateAdminProductSeal(id, payload),
    onSuccess: async () => {
      await invalidate();
      closeModal();
      Alert.alert("Sello actualizado", "Los productos que usaban este sello también fueron actualizados.");
    },
    onError: (error: any) => Alert.alert("No se pudo actualizar", error?.response?.data?.message ?? "Revisa los datos del sello."),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAdminProductSeal,
    onSuccess: async () => {
      await invalidate();
      Alert.alert("Sello eliminado", "El sello fue retirado del catálogo y desvinculado de los productos que lo utilizaban.");
    },
    onError: (error: any) => Alert.alert("No se pudo eliminar", error?.response?.data?.message ?? "Inténtalo nuevamente."),
  });

  const syncMut = useMutation({
    mutationFn: syncExistingProductSeals,
    onSuccess: async (result) => {
      await invalidate();
      Alert.alert(
        "Sellos sincronizados",
        `Se revisaron los productos y el catálogo anterior. Total disponible: ${result?.total ?? 0}.`
      );
    },
    onError: (error: any) => Alert.alert("No se pudo sincronizar", error?.response?.data?.message ?? "Inténtalo nuevamente."),
  });

  const seals = sealsQ.data ?? [];
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return seals;
    return seals.filter((item) => {
      const haystack = `${sealName(item)} ${sealNameEn(item)} ${sealImage(item)}`.toLowerCase();
      return haystack.includes(text);
    });
  }, [query, seals]);

  const stats = useMemo(() => {
    const active = seals.filter((item) => item.activo !== false).length;
    const missingImage = seals.filter((item) => !sealImage(item)).length;
    const usage = seals.reduce((sum, item) => sum + Number(item.usageCount ?? 0), 0);
    return { active, missingImage, usage };
  }, [seals]);

  const saving = createMut.isPending || updateMut.isPending || deleteMut.isPending || syncMut.isPending;

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setDraft({ ...emptyDraft });
  }

  function openCreate() {
    setEditing(null);
    setDraft({ ...emptyDraft });
    setModalOpen(true);
  }

  function openEdit(item: ProductSealOption) {
    setEditing(item);
    setDraft({
      nombreEs: sealName(item),
      nombreEn: sealNameEn(item),
      imageUrl: sealImage(item),
      activo: item.activo !== false,
    });
    setModalOpen(true);
  }

  function save() {
    const nombreEs = draft.nombreEs.trim() || draft.nombreEn.trim();
    const nombreEn = draft.nombreEn.trim() || draft.nombreEs.trim();
    const imageUrl = draft.imageUrl.trim();

    if (!nombreEs) {
      Alert.alert("Nombre requerido", "Agrega al menos el nombre del sello en español o inglés.");
      return;
    }
    if (!imageUrl) {
      Alert.alert("Imagen requerida", "Carga una imagen desde el teléfono o agrega el enlace de la imagen.");
      return;
    }

    const payload = { nombreEs, nombreEn, imageUrl, activo: draft.activo };
    if (editing?.id != null) updateMut.mutate({ id: editing.id, payload });
    else createMut.mutate(payload);
  }

  function confirmDelete(item: ProductSealOption) {
    if (item.id == null) return;
    const usage = Number(item.usageCount ?? 0);
    Alert.alert(
      "Eliminar sello",
      usage > 0
        ? `Este sello está asociado a ${usage} producto(s). Al eliminarlo también se quitará esa asociación de los productos. ¿Deseas continuar?`
        : "¿Deseas eliminar este sello del catálogo?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => deleteMut.mutate(item.id!) },
      ]
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}> 
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(item.id ?? `${sealName(item)}-${index}`)}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) + 96 }}
        refreshControl={<RefreshControl refreshing={sealsQ.isRefetching} onRefresh={() => sealsQ.refetch()} />}
        ListHeaderComponent={
          <>
            <AdminModuleHero
              eyebrow="Catálogo visual"
              title="Sellos"
              subtitle="Administra nombres, imágenes y disponibilidad de los sellos usados en productos."
              icon="ribbon-outline"
              total={seals.length}
              totalLabel="sellos"
              tone="catalog"
              actions={[
                { label: "Nuevo sello", icon: "add-circle-outline", onPress: openCreate, primary: true },
                { label: "Importar existentes", icon: "sync-outline", onPress: () => syncMut.mutate(), disabled: syncMut.isPending },
              ]}
            />
            <AdminMiniStatRow
              stats={[
                { label: "Activos", value: stats.active, icon: "checkmark-circle-outline" },
                { label: "Sin imagen", value: stats.missingImage, icon: "image-outline" },
                { label: "Usos", value: stats.usage, icon: "cube-outline" },
              ]}
            />
            <AdminCommandBar
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por nombre o enlace de imagen"
              chips={["Sin duplicados", "Cloudinary", "Productos vinculados"]}
            />
          </>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}> 
            <Ionicons name="ribbon-outline" size={34} color={c.muted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No hay sellos para mostrar</Text>
            <Text style={[styles.emptyCopy, { color: c.muted }]}>Crea uno nuevo o importa los que existen dentro de los productos.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <SealCard item={item} onEdit={() => openEdit(item)} onDelete={() => confirmDelete(item)} />
        )}
      />

      <AdminFloatingActionButton label="Nuevo" onPress={openCreate} bottom={Math.max(insets.bottom, 18) + 12} />
      <AdminSavingOverlay visible={saving} label={syncMut.isPending ? "Sincronizando sellos..." : "Guardando cambios..."} />

      <Modal visible={modalOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeModal}>
        <SafeAreaView edges={["top", "bottom"]} style={[styles.modalSafe, { backgroundColor: c.bg }]}> 
          <View style={[styles.modalHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}> 
            <View style={styles.modalTitleWrap}>
              <Text style={[styles.modalEyebrow, { color: c.primary }]}>{editing ? "Editar sello" : "Nuevo sello"}</Text>
              <Text numberOfLines={1} style={[styles.modalTitle, { color: c.text }]}>{editing ? sealName(editing) : "Agregar al catálogo"}</Text>
            </View>
            <Pressable onPress={closeModal} hitSlop={12} style={[styles.closeBtn, { backgroundColor: c.bg, borderColor: c.border }]}> 
              <Ionicons name="close" size={28} color={c.text} />
            </Pressable>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
              <View style={[styles.formCard, { backgroundColor: c.card, borderColor: c.border }]}> 
                <Text style={[styles.sectionTitle, { color: c.text }]}>Información del sello</Text>
                <Text style={[styles.sectionCopy, { color: c.muted }]}>El nombre se usa en los selectores de productos. El nombre inglés es opcional.</Text>
                <Field label="Nombre en español" value={draft.nombreEs} onChangeText={(value) => setDraft((current) => ({ ...current, nombreEs: value }))} />
                <Field label="Nombre en inglés" value={draft.nombreEn} onChangeText={(value) => setDraft((current) => ({ ...current, nombreEn: value }))} />
              </View>

              <View style={[styles.formCard, { backgroundColor: c.card, borderColor: c.border }]}> 
                <Text style={[styles.sectionTitle, { color: c.text }]}>Imagen y vista previa</Text>
                <Text style={[styles.sectionCopy, { color: c.muted }]}>Puedes seleccionar una imagen del teléfono o pegar un enlace. Los enlaces externos se copiarán a Cloudinary al guardar.</Text>
                <ImagePickerUpload
                  label="Imagen del sello"
                  value={draft.imageUrl}
                  onChange={(imageUrl) => setDraft((current) => ({ ...current, imageUrl }))}
                  folder="kosher-costa-rica/sellos"
                  textColor={c.text}
                  mutedColor={c.muted}
                  borderColor={c.border}
                  backgroundColor={c.bg}
                />
                {!!draft.imageUrl.trim() && (
                  <View style={[styles.largePreview, { backgroundColor: c.bg, borderColor: c.border }]}> 
                    <CachedImage uri={draft.imageUrl.trim()} style={styles.largePreviewImage} resizeMode="contain" />
                    <Text style={[styles.previewLabel, { color: c.muted }]}>Vista previa del sello</Text>
                  </View>
                )}
              </View>

              <Pressable onPress={() => setDraft((current) => ({ ...current, activo: !current.activo }))} style={[styles.switchRow, { backgroundColor: c.card, borderColor: c.border }]}> 
                <View style={styles.switchCopy}>
                  <Text style={[styles.sectionTitle, { color: c.text }]}>Sello activo</Text>
                  <Text style={[styles.sectionCopy, { color: c.muted }]}>Los sellos inactivos no aparecen al crear o editar productos.</Text>
                </View>
                <View style={[styles.switchTrack, draft.activo && { backgroundColor: c.primary }]}> 
                  <View style={[styles.switchKnob, draft.activo && styles.switchKnobOn]} />
                </View>
              </Pressable>

              {editing ? (
                <View style={[styles.metaCard, { borderColor: c.border }]}> 
                  <Text style={[styles.metaText, { color: c.muted }]}>Productos vinculados: {editing.usageCount ?? 0}</Text>
                  {!!editing.actualizadoEn && <Text style={[styles.metaText, { color: c.muted }]}>Última actualización: {new Date(editing.actualizadoEn).toLocaleString()}</Text>}
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.formFooter, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 12) }]}> 
              <Pressable onPress={closeModal} disabled={saving} style={[styles.footerBtn, { backgroundColor: c.bg, borderColor: c.border }]}> 
                <Text style={[styles.footerBtnText, { color: c.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={save} disabled={saving} style={[styles.footerBtn, styles.saveBtn, { backgroundColor: c.primary, borderColor: c.primary }, saving && { opacity: 0.6 }]}> 
                <Ionicons name="save-outline" size={18} color={c.primaryText} />
                <Text style={[styles.footerBtnText, { color: c.primaryText }]}>{editing ? "Guardar cambios" : "Crear sello"}</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function SealCard({ item, onEdit, onDelete }: { item: ProductSealOption; onEdit: () => void; onDelete: () => void }) {
  const { palette: c } = useTheme();
  const imageUrl = sealImage(item);
  const active = item.activo !== false;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}> 
      <View style={[styles.imageShell, { backgroundColor: c.bg, borderColor: c.border }]}> 
        {imageUrl ? <CachedImage uri={imageUrl} style={styles.cardImage} resizeMode="contain" /> : <Ionicons name="image-outline" size={28} color={c.muted} />}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text numberOfLines={2} style={[styles.cardTitle, { color: c.text }]}>{sealName(item) || "Sello sin nombre"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: active ? "#dcfce7" : "#e2e8f0" }]}> 
            <Text style={[styles.statusText, { color: active ? "#166534" : "#475569" }]}>{active ? "Activo" : "Inactivo"}</Text>
          </View>
        </View>
        {!!sealNameEn(item) && sealNameEn(item) !== sealName(item) ? <Text numberOfLines={1} style={[styles.cardSubtitle, { color: c.muted }]}>{sealNameEn(item)}</Text> : null}
        <View style={styles.usageRow}>
          <Ionicons name="cube-outline" size={15} color={c.muted} />
          <Text style={[styles.usageText, { color: c.muted }]}>{item.usageCount ?? 0} producto(s)</Text>
          {!imageUrl ? <Text style={styles.warningText}>Sin imagen</Text> : null}
        </View>
        <View style={styles.actionsRow}>
          <Pressable onPress={onEdit} style={[styles.smallBtn, { borderColor: c.border, backgroundColor: c.bg }]}> 
            <Ionicons name="create-outline" size={17} color={c.primary} />
            <Text style={[styles.smallBtnText, { color: c.primary }]}>Editar</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={[styles.smallBtn, styles.deleteBtn]}> 
            <Ionicons name="trash-outline" size={17} color="#b91c1c" />
            <Text style={[styles.smallBtnText, { color: "#b91c1c" }]}>Eliminar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  const { palette: c } = useTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: c.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={c.muted}
        style={[styles.input, { color: c.text, backgroundColor: c.bg, borderColor: c.border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  emptyCard: { marginHorizontal: 10, marginTop: 8, borderWidth: 1, borderRadius: 22, padding: 28, alignItems: "center" },
  emptyTitle: { marginTop: 10, fontSize: 17, fontWeight: "900" },
  emptyCopy: { marginTop: 5, textAlign: "center", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  card: { marginHorizontal: 10, marginBottom: 10, borderWidth: 1, borderRadius: 22, padding: 12, flexDirection: "row", gap: 12, shadowColor: "#0f172a", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  imageShell: { width: 92, height: 92, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardImage: { width: "100%", height: "100%" },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: "900" },
  cardSubtitle: { marginTop: 2, fontSize: 12, fontWeight: "700" },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 10, fontWeight: "900" },
  usageRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 9 },
  usageText: { fontSize: 11, fontWeight: "800" },
  warningText: { marginLeft: 5, color: "#b45309", fontSize: 11, fontWeight: "900" },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 11 },
  smallBtn: { minHeight: 38, borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  deleteBtn: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  smallBtnText: { fontSize: 11, fontWeight: "900" },
  modalSafe: { flex: 1 },
  modalHeader: { minHeight: 76, borderBottomWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  modalTitleWrap: { flex: 1, minWidth: 0 },
  modalEyebrow: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  modalTitle: { marginTop: 2, fontSize: 21, fontWeight: "900" },
  closeBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  formContent: { padding: 14, paddingBottom: 28 },
  formCard: { borderWidth: 1, borderRadius: 22, padding: 15, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "900" },
  sectionCopy: { marginTop: 4, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  fieldWrap: { marginTop: 14 },
  fieldLabel: { marginBottom: 7, fontSize: 12, fontWeight: "900" },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, fontSize: 14, fontWeight: "700" },
  largePreview: { marginTop: 14, borderWidth: 1, borderRadius: 20, padding: 12, alignItems: "center" },
  largePreviewImage: { width: "100%", height: 190 },
  previewLabel: { marginTop: 8, fontSize: 11, fontWeight: "800" },
  switchRow: { borderWidth: 1, borderRadius: 22, padding: 15, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 14 },
  switchCopy: { flex: 1 },
  switchTrack: { width: 50, height: 30, borderRadius: 999, padding: 4, backgroundColor: "#cbd5e1" },
  switchKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 3, elevation: 2 },
  switchKnobOn: { transform: [{ translateX: 20 }] },
  metaCard: { borderTopWidth: 1, paddingTop: 12, gap: 4 },
  metaText: { fontSize: 11, fontWeight: "700" },
  formFooter: { borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 10, flexDirection: "row", gap: 10 },
  footerBtn: { minHeight: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  saveBtn: { flex: 1 },
  footerBtnText: { fontSize: 13, fontWeight: "900" },
});
