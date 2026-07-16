import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "@/components/AppHeader";
import { COLORS } from "@/theme/colors";
import { useAuth } from "@/auth/auth";

export function AdminHomeScreen() {
  const nav = useNavigation<any>();
  const { signOut } = useAuth();
  return (
    <ScrollView contentContainerStyle={styles.root}>
      <AppHeader title="Administrador" />
      <View style={styles.body}>
        <Text style={styles.h1}>Panel de administración</Text>
        <Pressable style={styles.card} onPress={() => nav.navigate("AdminProductos")}>
          <Text style={styles.cardTitle}>Productos</Text>
          <Text style={styles.cardSub}>Ver listado y buscar</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => nav.navigate("AdminImport")}>
          <Text style={styles.cardTitle}>Importar Excel</Text>
          <Text style={styles.cardSub}>Carga masiva de productos</Text>
        </Pressable>

        <Pressable style={[styles.card, { backgroundColor: "#111827" }]} onPress={signOut}>
          <Text style={[styles.cardTitle, { color: COLORS.white }]}>Cerrar sesión</Text>
          <Text style={[styles.cardSub, { color: "#d1d5db" }]}>Salir del modo administrador</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  body: { padding: 16 },
  h1: { fontSize: 20, fontWeight: "900", color: COLORS.white, marginBottom: 12 },
  card: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
});
