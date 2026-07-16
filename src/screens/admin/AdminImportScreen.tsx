import React from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { listAdminProducts, importProductsExcel } from "@/features/admin/api/adminProductsApi";
import { exportRowsToExcel, pickExcelDocument } from "@/features/admin/utils/excelIO";

export function AdminImportScreen() {
  const { palette: c } = useTheme();
  const { t } = useI18n();
  const { data: products = [] } = useQuery({ queryKey: ["admin-products-import"], queryFn: listAdminProducts });

  const importMut = useMutation({
    mutationFn: importProductsExcel,
    onSuccess: (data: any) => Alert.alert(t("importCompleted"), data?.message ?? t("done")),
    onError: (e: any) => Alert.alert(t("error"), e?.response?.data?.message ?? t("importFailed")),
  });

  const onImport = async () => {
    const file = await pickExcelDocument();
    if (!file) return;
    importMut.mutate(file as any);
  };

  const onExport = async () => {
    try {
      const uri = await exportRowsToExcel({
        rows: products,
        sheetName: t("products"),
        filename: `productos_backup_${Date.now()}.xlsx`,
      });
      if (uri) Alert.alert(t("fileCreated"), `${t("savedAt")}: ${uri}`);
    } catch {
      Alert.alert(t("error"), t("exportFailed"));
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}> 
      <AppHeader title="Admin · Excel" />
      <View style={styles.body}>
        <Text style={[styles.h1, { color: c.text }]}>Excel</Text>
        <Text style={[styles.p, { color: c.muted }]}>Importa o exporta productos desde un solo flujo rápido.</Text>

        <Pressable style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} onPress={onImport}>
          <Ionicons name="cloud-upload-outline" size={22} color={c.text} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: c.text }]}>{t("import")}</Text>
            <Text style={[styles.cardText, { color: c.muted }]}>Carga un archivo Excel y envíalo directo al backend.</Text>
          </View>
        </Pressable>

        <Pressable style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} onPress={onExport}>
          <Ionicons name="download-outline" size={22} color={c.text} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: c.text }]}>{t("export")}</Text>
            <Text style={[styles.cardText, { color: c.muted }]}>Genera un respaldo actual de productos en Excel.</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 16, gap: 14 },
  h1: { fontSize: 22, fontWeight: "900" },
  p: { fontSize: 13, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: "row", gap: 12, alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  cardText: { fontSize: 13, lineHeight: 18, marginTop: 4 },
});
