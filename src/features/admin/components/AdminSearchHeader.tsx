import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type Props = {
  title: string;
  subtitle?: string;
  query: string;
  onQueryChange: (value: string) => void;
  onCreate?: () => void;
  createLabel?: string;
  total?: number;
  colors: { text: string; muted: string; card: string; border: string; primary: string; primaryText: string };
};

export default function AdminSearchHeader({ title, subtitle, query, onQueryChange, onCreate, createLabel = "Nuevo", total, colors }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{title}</Text>
          {!!subtitle && <Text numberOfLines={2} style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>}
        </View>
        {typeof total === "number" ? <View style={[styles.count, { backgroundColor: `${colors.primary}18` }]}><Text style={[styles.countText, { color: colors.primary }]}>{total}</Text></View> : null}
        {onCreate ? (
          <Pressable onPress={onCreate} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={20} color={colors.primaryText} />
            <Text style={[styles.createText, { color: colors.primaryText }]}>{createLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.searchShell, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput value={query} onChangeText={onQueryChange} placeholder="Buscar" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text }]} />
        {!!query && <Pressable onPress={() => onQueryChange("")} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  titleBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "900" },
  subtitle: { marginTop: 3, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  count: { minWidth: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  countText: { fontSize: 17, fontWeight: "900" },
  createBtn: { minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 13, flexDirection: "row", gap: 6 },
  createText: { fontWeight: "900", fontSize: 13 },
  searchShell: { minHeight: 52, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, minHeight: 50, fontSize: 14, fontWeight: "700" },
});
