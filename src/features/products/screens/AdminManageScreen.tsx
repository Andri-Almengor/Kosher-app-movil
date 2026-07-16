import React, { useMemo, useLayoutEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, FlatList, ListRenderItem } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ProductRepository } from "../data/ProductRepository";
import type { Product, ProvinceCR } from "../api/types";
import { useAdminFilters } from "../admin/adminFiltersStore";
import Card from "../../../ui/Card";
import Input from "../../../ui/Input";
import Button from "../../../ui/Button";
import Checkbox from "../../../ui/Checkbox";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "../../../theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";


const PROVINCES: (ProvinceCR | "Todas")[] = [
  "Todas", "San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"
];

export default function AdminManageScreen() {
  const { t } = useI18n();
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const { palette } = useTheme();

  const { data } = useQuery({ queryKey: ["products"], queryFn: () => ProductRepository.list() });
  const all = data ?? [];

  const {
    q, province, brand, minPrice, maxPrice, sort, expanded, set, reset, toggle, collapse, isActive
  } = useAdminFilters();

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Pressable onPress={() => nav.navigate("AdminEdit")} hitSlop={10}>
            <Ionicons name="add-circle-outline" size={24} color="#111" />
          </Pressable>
          <Pressable onPress={toggle} hitSlop={10}>
            <Ionicons name="search" size={22} color={isActive() ? "#111" : "#666"} />
          </Pressable>
        </View>
      ),
    });
  }, [nav, toggle, isActive]);

  const brands = useMemo(() => {
    const s = new Set(all.map(p => p.brand).filter(Boolean));
    return ["Todas", ...Array.from(s)];
  }, [all]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    const min = Number(minPrice) || 0;
    const max = Number(maxPrice) || Number.MAX_SAFE_INTEGER;

    let tmp = all.filter(p => {
      const matchesQ = !qLower || [p.name, p.brand, p.storeName].some(v => v?.toLowerCase().includes(qLower));
      const matchesProv = province === "Todas" || p.province === province;
      const matchesBrand = brand === "Todas" || p.brand === brand;
      const matchesPrice = p.price >= min && p.price <= max;
      return matchesQ && matchesProv && matchesBrand && matchesPrice;
    });

    switch (sort) {
      case "nameAZ": tmp.sort((a,b) => a.name.localeCompare(b.name)); break;
      case "priceAsc": tmp.sort((a,b) => a.price - b.price); break;
      case "priceDesc": tmp.sort((a,b) => b.price - a.price); break;
      default: tmp.sort((a,b) => (a.id < b.id ? 1 : -1)); break; // "recents"
    }
    return tmp;
  }, [all, q, province, brand, minPrice, maxPrice, sort]);

  // selección múltiple
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const clearSel = () => setSelected(new Set());

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    const n = selected.size;
    Alert.alert("Eliminar productos", `¿Eliminar ${n} producto(s)?`, [
      { text: t("cancel"), style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          for (const id of Array.from(selected)) {
            await ProductRepository.remove(id);
          }
          clearSel();
          await qc.invalidateQueries({ queryKey: ["products"] });
        },
      },
    ]);
  };

  const renderItem: ListRenderItem<Product> = ({ item }) => (
    <Card style={s.row}>
      <Checkbox checked={selected.has(item.id)} onChange={() => toggleSel(item.id)} />
      <Pressable onPress={() => nav.navigate("AdminEdit", { id: item.id })} style={{ flex: 1 }}>
        <Text style={{ fontWeight: "700" }}>{item.name}</Text>
        <Text style={{ color: "#666", marginTop: 4 }}>{item.brand} · ₡{item.price}</Text>
      </Pressable>
      <Button title="Editar" variant="outline" size="sm" onPress={() => nav.navigate("AdminEdit", { id: item.id })} />
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {expanded && (
        <Card style={s.filterCard}>
          <Text style={s.titleSm}>Búsqueda</Text>
          <View style={{ position: "relative" }}>
            <Input
              value={q}
              onChangeText={(t) => set({ q: t })}
              placeholder="Buscar por nombre, marca o tienda"
              style={{ paddingLeft: 40 }}
            />
            <Ionicons name="search" size={18} color={palette.muted} style={{ position: "absolute", left: 12, top: 13 }} />
          </View>

          <View style={s.rowInline}>
            <View style={s.field}>
              <Text style={s.label}>Provincia</Text>
              <View style={s.pickerWrap}>
                <Picker selectedValue={province} onValueChange={(v) => set({ province: v as any })} style={s.picker}>
                  {PROVINCES.map(p => <Picker.Item key={p} label={p} value={p} />)}
                </Picker>
              </View>
            </View>
            <View style={[s.field, { marginLeft: 8 }]}>
              <Text style={s.label}>Marca</Text>
              <View style={s.pickerWrap}>
                <Picker selectedValue={brand} onValueChange={(v) => set({ brand: v as any })} style={s.picker}>
                  {brands.map(b => <Picker.Item key={b} label={b} value={b} />)}
                </Picker>
              </View>
            </View>
          </View>

          <Text style={[s.titleSm, { marginTop: 10 }]}>Precio</Text>
          <View style={s.rowInline}>
            <View style={s.field}>
              <Text style={s.label}>Mínimo</Text>
              <Input value={minPrice} onChangeText={(t) => set({ minPrice: t })} placeholder="₡ min" keyboardType="numeric" />
            </View>
            <View style={[s.field, { marginLeft: 8 }]}>
              <Text style={s.label}>Máximo</Text>
              <Input value={maxPrice} onChangeText={(t) => set({ maxPrice: t })} placeholder="₡ max" keyboardType="numeric" />
            </View>
          </View>

          <Text style={[s.titleSm, { marginTop: 10 }]}>Ordenar por</Text>
          <View style={s.pickerWrap}>
            <Picker selectedValue={sort} onValueChange={(v) => set({ sort: v as any })} style={s.picker}>
              <Picker.Item label="Más recientes" value="recents" />
              <Picker.Item label="Nombre (A–Z)" value="nameAZ" />
              <Picker.Item label="Precio (menor a mayor)" value="priceAsc" />
              <Picker.Item label="Precio (mayor a menor)" value="priceDesc" />
            </Picker>
          </View>

          <View style={s.actionsRow}>
            <Button title="Limpiar" variant="outline" onPress={reset} />
            <Button title="Aplicar" onPress={collapse} />
          </View>
        </Card>
      )}

      {selected.size > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Card style={{ padding: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "700" }}>{selected.size} seleccionados</Text>
            <Button title="Eliminar" variant="outline" tone="danger" onPress={deleteSelected} />
          </Card>
        </View>
      )}

      <FlatList<Product>
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={{ padding: 16, paddingTop: expanded ? 0 : 8 }}
        ListEmptyComponent={<Text style={{ margin: 16, color: "#666" }}>Sin resultados.</Text>}
        initialNumToRender={16}
        windowSize={7}
        removeClippedSubviews
      />
    </View>
  );
}

const s = StyleSheet.create({
  filterCard: { margin: 16, marginBottom: 8, padding: 12 },
  titleSm: { fontSize: 12, fontWeight: "700", color: "#111", marginBottom: 6 },
  rowInline: { flexDirection: "row", marginTop: 8, alignItems: "center" },
  field: { flex: 1, minWidth: 0 },
  label: { fontSize: 12, color: "#6B7280", marginBottom: 4, fontWeight: "600" },
  pickerWrap: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
    height: 48, justifyContent: "center", paddingHorizontal: 4, backgroundColor: "#fff", overflow: "hidden",
  },
  picker: { width: "100%", height: 44 },
  actionsRow: { flexDirection: "row", alignItems: "center", marginTop: 12, justifyContent: "space-between" },
  row: { padding: 12, flexDirection: "row", alignItems: "center", gap: 12 },
});