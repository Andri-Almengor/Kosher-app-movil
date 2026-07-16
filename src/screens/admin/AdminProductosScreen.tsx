import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { SearchBar } from "@/components/SearchBar";
import { api } from "@/lib/api";
import { COLORS } from "@/theme/colors";
import { Producto } from "@/types/producto";

export function AdminProductosScreen() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/productos", { params: q ? { q } : undefined });
      setData(res.data?.items ?? res.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <View style={styles.root}>
      <AppHeader title="Admin · Productos" />
      <View style={styles.searchWrap}>
        <SearchBar value={q} onChangeText={setQ} onPressFilter={() => {}} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <Pressable style={styles.row}>
              <Text style={styles.rowTitle}>{item.fabricanteMarca}</Text>
              <Text style={styles.rowSub}>{item.nombre}</Text>
              <Text style={styles.rowTiny}>{item.categoria1}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  searchWrap: { padding: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14 },
  rowTitle: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rowTiny: { fontSize: 10, color: COLORS.textMuted, marginTop: 8 },
});
