import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet, ScrollView, Image, TextInput } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { CreatableSelect } from "@/components/CreatableSelect";
import type { SealFilterOption } from "@/features/products/utils/filterValueHelpers";

export type ProductFilters = {
  tienda?: string;
  sello?: string;
  certifica?: string;
  catGeneral?: string;
  categoria1?: string;
  atributo1?: string;
  atributo2?: string;
  atributo3?: string;
};

type Props = {
  visibleKeys?: Array<keyof ProductFilters>;
  visible: boolean;
  onClose: () => void;
  value: ProductFilters;
  options: {
    tienda: string[];
    sello: string[];
    selloVisuales?: SealFilterOption[];
    certifica: string[];
    catGeneral: string[];
    categoria1: string[];
    atributo1: string[];
    atributo2: string[];
    atributo3: string[];
  };
  onApply: (filters: ProductFilters) => void;
};

const norm = (s?: string | null) => (s ?? "").trim();

function SealFilterSelect({ label, value, options, onChange }: { label: string; value: string; options: SealFilterOption[]; onChange: (v: string) => void; }) {
  const { palette: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = norm(value);

  const selectedOption = useMemo(() => options.find((option) => norm(option.value) === selected) ?? null, [options, selected]);

  const filteredOptions = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.value.toLowerCase().includes(term));
  }, [options, q]);

  const close = () => {
    setOpen(false);
    setQ("");
  };

  const pick = (nextValue: string) => {
    onChange(nextValue);
    close();
  };

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ color: c.muted, fontWeight: "800", marginBottom: 6 }}>{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={[s.sealSelect, { borderColor: c.border, backgroundColor: c.card }]}
      >
        <View style={[s.sealSelectThumb, { borderColor: c.border, backgroundColor: c.bg }]}>
          {selectedOption?.imageUrl ? (
            <Image source={{ uri: selectedOption.imageUrl }} style={s.sealSelectImage} resizeMode="contain" />
          ) : (
            <Ionicons name="ribbon-outline" size={22} color={c.muted} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: selectedOption ? c.text : c.muted, fontWeight: "900", fontSize: 15 }} numberOfLines={1}>
            {selectedOption?.value || "Todos los sellos"}
          </Text>
          <Text style={{ color: c.muted, fontWeight: "700", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            Toca para elegir por nombre e imagen
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={c.muted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close} statusBarTranslucent={false} presentationStyle="fullScreen">
        <View style={[s.sealModalRoot, { backgroundColor: c.bg, paddingTop: Math.max(insets.top + 18, 36), paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
          <View style={s.sealModalTop}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: "900", fontSize: 20 }}>{label}</Text>
              <Text style={{ color: c.muted, fontWeight: "700", fontSize: 12, marginTop: 2 }}>
                Filtra productos usando los sellos guardados.
              </Text>
            </View>
            <Pressable onPress={close} hitSlop={10} style={[s.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}>
              <Ionicons name="close" size={22} color={c.text} />
            </Pressable>
          </View>

          <View style={[s.searchWrap, { borderColor: c.border, backgroundColor: c.card }]}>
            <Ionicons name="search" size={18} color={c.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Buscar sello"
              placeholderTextColor={c.muted}
              style={{ flex: 1, color: c.text, fontWeight: "700" }}
            />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
            <Pressable
              onPress={() => pick("")}
              style={[s.sealOption, { borderColor: !selected ? c.primary : c.border, backgroundColor: !selected ? "rgba(54,98,167,0.10)" : c.card }]}
            >
              <View style={[s.sealOptionImageWrap, { borderColor: c.border, backgroundColor: c.bg }]}>
                <Ionicons name="apps-outline" size={24} color={!selected ? c.primary : c.muted} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: c.text, fontWeight: "900", fontSize: 15 }} numberOfLines={1}>Todos los sellos</Text>
                <Text style={{ color: c.muted, fontWeight: "700", fontSize: 12, marginTop: 3 }} numberOfLines={1}>Mostrar productos sin filtrar por sello</Text>
              </View>
              {!selected ? <Ionicons name="checkmark-circle" size={22} color={c.primary} /> : null}
            </Pressable>

            {filteredOptions.map((option) => {
              const isSelected = norm(option.value) === selected;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => pick(option.value)}
                  style={[s.sealOption, { borderColor: isSelected ? c.primary : c.border, backgroundColor: isSelected ? "rgba(54,98,167,0.10)" : c.card }]}
                >
                  <View style={[s.sealOptionImageWrap, { borderColor: c.border, backgroundColor: c.bg }]}>
                    {option.imageUrl ? (
                      <Image source={{ uri: option.imageUrl }} style={s.sealOptionImage} resizeMode="contain" />
                    ) : (
                      <Ionicons name="ribbon-outline" size={24} color={c.muted} />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: c.text, fontWeight: "900", fontSize: 15 }} numberOfLines={2}>
                      {option.value}
                    </Text>
                    <Text style={{ color: c.muted, fontWeight: "700", fontSize: 12, marginTop: 3 }} numberOfLines={1}>Sello disponible</Text>
                  </View>
                  {isSelected ? <Ionicons name="checkmark-circle" size={22} color={c.primary} /> : null}
                </Pressable>
              );
            })}

            {!filteredOptions.length ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <Ionicons name="search-outline" size={28} color={c.muted} />
                <Text style={{ color: c.muted, fontWeight: "800", marginTop: 8 }}>Sin sellos encontrados</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}


export function ProductFiltersModal({ visible, onClose, value, options, onApply, visibleKeys }: Props) {
  const { palette: c } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<ProductFilters>(value ?? {});

  useEffect(() => {
    if (visible) setDraft(value ?? {});
  }, [visible, value]);

  const keys = visibleKeys?.length ? visibleKeys : ["tienda", "sello", "certifica", "catGeneral", "categoria1", "atributo1", "atributo2", "atributo3"];

  const hasAny = useMemo(() => keys.some((k) => !!norm(draft[k])), [draft, keys]);

  const activeChips = useMemo(() => {
    const pairs: Array<{ k: keyof ProductFilters; label: string; value: string }> = [
      { k: "tienda", label: t("tienda"), value: norm(draft.tienda) },
      { k: "catGeneral", label: t("catGeneral"), value: norm(draft.catGeneral) },
      { k: "categoria1", label: t("categoria1"), value: norm(draft.categoria1) },
      { k: "sello", label: t("selloOptional"), value: norm(draft.sello) },
      { k: "certifica", label: t("certificaOptional"), value: norm(draft.certifica) },
      { k: "atributo1", label: t("atributo1"), value: norm(draft.atributo1) },
      { k: "atributo2", label: t("atributo2"), value: norm(draft.atributo2) },
    ];
    return pairs.filter((p) => !!p.value);
  }, [draft, t]);

  const clearAll = () => setDraft({});

  const apply = () => {
    const cleaned: ProductFilters = {};
    (Object.keys(draft) as (keyof ProductFilters)[]).forEach((k) => {
      const v = norm(draft[k]);
      if (v) cleaned[k] = v;
    });
    onApply(cleaned);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent={false} presentationStyle="fullScreen">
      <View style={[s.root, { backgroundColor: c.bg }]}> 
        <View style={[s.top, { paddingTop: Math.max(insets.top + 18, 36) }]}> 
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: c.text }}>{t("filters")}</Text>
          </View>

          {hasAny ? (
            <Pressable onPress={clearAll} hitSlop={10} style={[s.ghostBtn, { borderColor: c.border, backgroundColor: c.card }]}> 
              <Ionicons name="trash-outline" size={16} color={c.text} />
              <Text style={{ color: c.text, fontWeight: "900", fontSize: 12 }}>{t("clear")}</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={onClose} hitSlop={10} style={[s.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="close" size={22} color={c.text} />
          </Pressable>
        </View>

        {activeChips.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {activeChips.map((chip) => (
              <Pressable key={chip.k} onPress={() => setDraft((s0) => ({ ...s0, [chip.k]: "" }))} style={[s.chip, { backgroundColor: c.card, borderColor: c.border }]}> 
                <Text style={{ color: c.text, fontWeight: "900" }} numberOfLines={1}>{chip.label}: {chip.value}</Text>
                <Ionicons name="close" size={14} color={c.muted} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, paddingBottom: 24 + Math.max(insets.bottom, 16) }}
        >
          {keys.includes("tienda") ? (
            <CreatableSelect
              label={t("tienda")}
              value={draft.tienda ?? ""}
              options={options.tienda}
              allowCreate={false}
              allowEmpty
              placeholder={t("select")}
              onChange={(v) => setDraft((s0) => ({ ...s0, tienda: v }))}
            />
          ) : null}

          {keys.includes("sello") ? (
            options.selloVisuales?.length ? (
              <SealFilterSelect label={t("selloOptional")} value={draft.sello ?? ""} options={options.selloVisuales} onChange={(v) => setDraft((s0) => ({ ...s0, sello: v }))} />
            ) : (
              <CreatableSelect
                label={t("selloOptional")}
                value={draft.sello ?? ""}
                options={options.sello}
                allowCreate={false}
                allowEmpty
                placeholder={t("select")}
                onChange={(v) => setDraft((s0) => ({ ...s0, sello: v }))}
              />
            )
          ) : null}

          {keys.includes("certifica") ? <CreatableSelect label={t("certificaOptional")} value={draft.certifica ?? ""} options={options.certifica} allowCreate={false} allowEmpty placeholder={t("select")} onChange={(v) => setDraft((s0) => ({ ...s0, certifica: v }))} /> : null}
          {keys.includes("catGeneral") ? <CreatableSelect label={t("catGeneral")} value={draft.catGeneral ?? ""} options={options.catGeneral} allowCreate={false} allowEmpty placeholder={t("select")} onChange={(v) => setDraft((s0) => ({ ...s0, catGeneral: v }))} /> : null}
          {keys.includes("categoria1") ? <CreatableSelect label={t("categoria1")} value={draft.categoria1 ?? ""} options={options.categoria1} allowCreate={false} allowEmpty placeholder={t("select")} onChange={(v) => setDraft((s0) => ({ ...s0, categoria1: v }))} /> : null}
          {keys.includes("atributo1") ? <CreatableSelect label={t("atributo1")} value={draft.atributo1 ?? ""} options={options.atributo1} allowCreate={false} allowEmpty placeholder={t("select")} onChange={(v) => setDraft((s0) => ({ ...s0, atributo1: v }))} /> : null}
          {keys.includes("atributo2") ? <CreatableSelect label={t("atributo2")} value={draft.atributo2 ?? ""} options={options.atributo2} allowCreate={false} allowEmpty placeholder={t("select")} onChange={(v) => setDraft((s0) => ({ ...s0, atributo2: v }))} /> : null}
          {keys.includes("atributo3") ? <CreatableSelect label={t("atributo3")} value={draft.atributo3 ?? ""} options={options.atributo3} allowCreate={false} allowEmpty placeholder={t("select")} onChange={(v) => setDraft((s0) => ({ ...s0, atributo3: v }))} /> : null}

          <View style={[s.bottomBar, { borderTopColor: c.border }]}> 
            <Pressable onPress={onClose} style={[s.bottomGhost, { borderColor: c.border, backgroundColor: c.card }]}>
              <Text style={{ color: c.text, fontWeight: "900" }}>{t("cancel")}</Text>
            </Pressable>
            <Pressable onPress={apply} style={[s.bottomPrimary, { backgroundColor: c.primary }]}>
              <Text style={{ color: c.primaryText, fontWeight: "900" }}>{t("apply")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  top: { paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  ghostBtn: { minHeight: 34, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  chip: { marginRight: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8, maxWidth: 280 },
  searchWrap: { minHeight: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 8 },
  bottomBar: { borderTopWidth: 1, paddingTop: 12, marginTop: 8, flexDirection: "row", gap: 12 },
  bottomGhost: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bottomPrimary: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sealSelect: { minHeight: 74, borderWidth: 1, borderRadius: 18, padding: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  sealSelectThumb: { width: 52, height: 52, borderWidth: 1, borderRadius: 15, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sealSelectImage: { width: "100%", height: "100%" },
  sealModalRoot: { flex: 1, paddingTop: 12 },
  sealModalTop: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  sealOption: { borderWidth: 1, borderRadius: 20, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  sealOptionImageWrap: { width: 64, height: 64, borderWidth: 1, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sealOptionImage: { width: "100%", height: "100%" },
  sealDropdownPreview: { borderWidth: 1, borderRadius: 18, marginTop: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  sealDropdownMedia: { width: 82, height: 82 },
  sealDropdownImage: { width: "100%", height: "100%" },
  sealDropdownEmpty: { width: "100%", height: "100%", borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
