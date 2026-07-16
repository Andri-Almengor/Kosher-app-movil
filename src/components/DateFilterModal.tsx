import React, { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";

export function DateFilterModal({
  visible,
  initialDate,
  onClose,
  onApply,
  onClear,
}: {
  visible: boolean;
  initialDate: Date | null;
  onClose: () => void;
  onApply: (d: Date) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const { palette: c } = useTheme();

  const [temp, setTemp] = useState<Date>(initialDate ?? new Date());
  const [androidPickerVisible, setAndroidPickerVisible] = useState(true);

  useEffect(() => {
    if (visible) {
      setTemp(initialDate ?? new Date());
      setAndroidPickerVisible(true);
    }
  }, [visible, initialDate]);

  const displayDate = useMemo(() => {
    const d = initialDate ?? temp;
    // basic yyyy-mm-dd
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [initialDate, temp]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}> 
          <Text style={[styles.title, { color: c.text }]}>{t("filterByDate")}</Text>
          <Text style={[styles.meta, { color: c.muted }]}>{displayDate}</Text>

          <View style={{ height: 10 }} />

          {Platform.OS === "ios" ? (
            <DateTimePicker
              value={temp}
              mode="date"
              display="inline"
              onChange={(_, d) => d && setTemp(d)}
            />
          ) : androidPickerVisible ? (
            <DateTimePicker
              value={temp}
              mode="date"
              display="default"
              onChange={(event, d) => {
                if (event.type === "dismissed") {
                  setAndroidPickerVisible(false);
                  setTimeout(() => onClose(), 0);
                  return;
                }
                if (d) setTemp(d);
              }}
            />
          ) : null}

          <View style={{ height: 14 }} />

          <View style={styles.row}>
            <Pressable onPress={onClear} style={[styles.btn, { borderColor: c.border }]}> 
              <Text style={{ color: c.text, fontWeight: "900" }}>{t("clear")}</Text>
            </Pressable>

            <View style={{ flex: 1 }} />

            <Pressable onPress={onClose} style={[styles.btn, { borderColor: c.border }]}> 
              <Text style={{ color: c.text, fontWeight: "900" }}>{t("cancel")}</Text>
            </Pressable>
            <Pressable onPress={() => onApply(temp)} style={[styles.btnPrimary, { backgroundColor: c.primary }]}> 
              <Text style={{ color: c.primaryText, fontWeight: "900" }}>{t("apply")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  title: { fontSize: 16, fontWeight: "900" },
  meta: { marginTop: 4, fontSize: 12, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
