import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  required?: boolean;
  allowCreate?: boolean;
  allowEmpty?: boolean;
  createLabel?: string;
  createPlaceholder?: string;
  /**
   * Se ejecuta cuando el usuario usa “Agregar valor”.
   * Útil para persistir opciones dinámicas en backend/SQLite y refrescar queries.
   */
  onCreateValue?: (v: string) => void | Promise<void>;
  onChange: (v: string) => void;
};

function norm(s: string) {
  return (s ?? "").trim();
}

function isInvalidOptionValue(s: string) {
  const v = norm(s);
  if (!v) return false;
  const upper = v.toUpperCase();
  return upper === "#VALUE!" || upper === "#N/A" || upper === "N/A" || upper === "NULL" || v.startsWith("=");
}

export const CreatableSelect = React.memo(function CreatableSelect({
  label,
  value,
  options,
  placeholder,
  required,
  allowCreate = true,
  allowEmpty,
  createLabel = "Agregar valor",
  createPlaceholder = "Escribí un valor nuevo",
  onCreateValue,
  onChange,
}: Props) {
  const { palette: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState("");
  const [localCreatedOptions, setLocalCreatedOptions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const cleanedOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const o of [...(options ?? []), ...localCreatedOptions]) {
      const v = norm(String(o));
      if (v && !isInvalidOptionValue(v)) uniq.add(v);
    }
    const arr = Array.from(uniq).sort((a, b) => a.localeCompare(b));
    return allowEmpty ? ["", ...arr] : arr;
  }, [options, localCreatedOptions, allowEmpty]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return cleanedOptions;
    return cleanedOptions.filter((o) => o.toLowerCase().includes(s));
  }, [cleanedOptions, q]);

  const display = value?.trim() && !isInvalidOptionValue(value) ? value : "";

  const close = () => {
    setOpen(false);
    setQ("");
    setCustom("");
  };

  const pick = (v: string) => {
    onChange(v);
    close();
  };

  const addCustom = async () => {
    const v = norm(custom);
    if (!v || creating) return;

    // Actualización optimista: el nuevo valor queda visible y seleccionado de inmediato,
    // aunque el backend/SQLite tarde en responder o el padre todavía no haya refrescado options.
    setLocalCreatedOptions((current) => {
      const exists = current.some((item) => norm(item).toLowerCase() === v.toLowerCase());
      return exists ? current : [v, ...current];
    });
    onChange(v);
    setCustom("");
    setQ("");

    if (!onCreateValue) {
      close();
      return;
    }

    try {
      setCreating(true);
      await onCreateValue(v);
      close();
    } catch {
      // No revertimos el valor elegido porque puede guardarse junto con el registro principal.
      close();
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ color: c.muted, fontWeight: "800", marginBottom: 6 }}>
        {label}
        {required ? " *" : ""}
      </Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={[
          sStyles.select,
          {
            backgroundColor: c.card,
            borderColor: c.border,
          },
        ]}
      >
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          style={{ color: display ? c.text : c.muted, fontWeight: "700", flex: 1, lineHeight: 18 }}
        >
          {display || placeholder || "Seleccionar"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.muted} />
      </Pressable>

      <Modal visible={open} animationType="fade" onRequestClose={close} statusBarTranslucent={false} presentationStyle="fullScreen">
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: undefined })}
          style={{ flex: 1, backgroundColor: c.bg }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: Math.max(insets.top + 16, 32),
              paddingBottom: Math.max(insets.bottom + 12, 20),
              paddingLeft: Math.max(insets.left, 0) + 16,
              paddingRight: Math.max(insets.right, 0) + 16,
              gap: 10,
              flex: 1,
            }}
          >
            <View style={sStyles.modalTop}>
              <Text style={{ fontSize: 18, fontWeight: "900", color: c.text, flex: 1 }} numberOfLines={1}>
                {label}
              </Text>
              <Pressable onPress={close} hitSlop={10} style={[sStyles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}>
                <Ionicons name="close" size={22} color={c.text} />
              </Pressable>
            </View>

            <View style={[sStyles.searchWrap, { borderColor: c.border, backgroundColor: c.card }]}>
              <Ionicons name="search" size={18} color={c.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Buscar"
                placeholderTextColor={c.muted}
                style={{ flex: 1, color: c.text, fontWeight: "700" }}
                autoCapitalize="none"
              />
            </View>

            {allowCreate ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: c.muted, fontWeight: "800" }}>{createLabel}</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    value={custom}
                    onChangeText={setCustom}
                    placeholder={createPlaceholder}
                    placeholderTextColor={c.muted}
                    style={[sStyles.customInput, { borderColor: c.border, backgroundColor: c.card, color: c.text }]}
                  />
                  <Pressable
                    onPress={addCustom}
                    disabled={!custom.trim() || creating}
                    style={[sStyles.addBtn, { backgroundColor: c.primary, opacity: !custom.trim() || creating ? 0.55 : 1 }]}
                  >
                    {creating ? <ActivityIndicator size="small" color={c.primaryText} /> : <Ionicons name="add" size={18} color={c.primaryText} />}
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Text style={{ color: c.muted, fontWeight: "800", marginTop: 4 }}>Opciones disponibles</Text>

            <FlatList
              data={filtered}
              keyExtractor={(i, index) => `${i}-${index}`}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              maxToRenderPerBatch={24}
              windowSize={8}
              removeClippedSubviews
              renderItem={({ item }) => {
                const selected = norm(item).toLowerCase() === norm(value).toLowerCase();
                const label = item === "" ? "Sin selección" : item;
                return (
                  <Pressable
                    onPress={() => pick(item)}
                    style={[
                      sStyles.option,
                      {
                        borderColor: c.border,
                        backgroundColor: selected ? "rgba(2,132,199,0.12)" : c.card,
                      },
                    ]}
                  >
                    <Text style={{ color: c.text, fontWeight: "800", flex: 1 }} numberOfLines={2}>
                      {label}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={18} color={c.primary} /> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={{ paddingVertical: 16 }}>
                  <Text style={{ color: c.muted, fontWeight: "700" }}>Sin resultados</Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
});

const sStyles = StyleSheet.create({
  select: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalTop: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
  iconBtn: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  searchWrap: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontWeight: "700",
  },
  addBtn: { width: 48, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});