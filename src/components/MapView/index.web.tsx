import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function MapViewWeb() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        El mapa no está disponible en la versión web.
      </Text>
    </View>
  );
}

export const Marker = () => null;

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
  },
  text: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 13,
  },
});
