// src/features/products/screens/FavoritesScreen.tsx
import React, { useMemo } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import { ProductRepository } from "../data/ProductRepository";
import { useFavorites } from "@/lib/storage/favoritesStore";
import { ProductCard } from "../components/ProductCard";

export default function FavoritesScreen() {
  const nav = useNavigation<any>();
  const fav = useFavorites();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products"],
    queryFn: () => ProductRepository.list(),
  });

  const favoriteIds = fav.list();

  const favorites = useMemo(
    () =>
      (data ?? []).filter((p) =>
        favoriteIds.includes(p.id)
      ),
    [data, favoriteIds]
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.helper}>Cargando productos guardados...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Favoritos</Text>
        <Text style={styles.helper}>
          Ocurrió un error al cargar tus productos guardados.
        </Text>
      </View>
    );
  }

  if (!favorites.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Favoritos</Text>
        <Text style={styles.helper}>
          Todavía no has guardado productos. Guarda alguno desde el listado
          para verlo aquí.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#fff" }}
      data={favorites}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingVertical: 8 }}
      renderItem={({ item }) => (
        <ProductCard
          item={item}
          saved={true}
          onToggle={() => fav.toggle(item.id)}
          // Ruta de detalle que ya usabas antes
          onPress={() => nav.navigate("FavDetail", { product: item })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  helper: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
