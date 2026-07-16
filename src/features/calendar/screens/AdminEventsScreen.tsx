import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { listEvents, deleteEventAdmin, type CalendarEvent } from "../api/calendarApi";
import { useI18n } from "@/i18n/I18nProvider";

export default function AdminEventsScreen() {
  const { t } = useI18n();
  const nav = useNavigation<any>();
  const qc = useQueryClient();

  const { data: events = [], isFetching } = useQuery({
    queryKey: ["calendar-events-admin"],
    queryFn: () => listEvents(),
  });

  const del = useMutation({
    mutationFn: (id: number) => deleteEventAdmin(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["calendar-events-admin"] });
      await qc.invalidateQueries({ queryKey: ["calendar-events"] });
    },
    onError: () => {
      Alert.alert(t("error"), t("couldNotDelete"));
    },
  });

  const confirmDelete = (ev: CalendarEvent) => {
    Alert.alert(
      t("deleteEventTitle"), // "Eliminar evento"
      `${t("confirmDelete")} "${ev.titulo}"?`, // ¿Eliminar "xxx"?
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => del.mutate(ev.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.createBtn}
        onPress={() => nav.navigate("AdminEventForm", { mode: "create" })}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.createTxt}>{t("createEvent")}</Text>
      </Pressable>

      <Text style={styles.helper}>
        {isFetching ? t("updating") : t("eventsRegistered")}
      </Text>

      <FlatList
        data={events}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => {
          const d = new Date(item.inicio);
          const dateLabel = isNaN(d.getTime())
            ? String(item.inicio)
            : d.toLocaleString([], {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });

          return (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.titulo}</Text>

                <Text style={styles.sub}>
                  {item.todoElDia ? t("allDay") : dateLabel}
                </Text>

                {!!item.ubicacion && <Text style={styles.meta}>📍 {item.ubicacion}</Text>}
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => nav.navigate("AdminEventForm", { mode: "edit", event: item })}
                >
                  <Ionicons name="create-outline" size={18} />
                </Pressable>

                <Pressable style={styles.iconBtn} onPress={() => confirmDelete(item)}>
                  <Ionicons name="trash-outline" size={18} color="#b91c1c" />
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>{t("noEventsYet")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 12 },
  createBtn: {
    backgroundColor: "#111",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  createTxt: { color: "#fff", fontWeight: "900" },
  helper: { marginTop: 10, fontSize: 12, color: "#6b7280" },
  card: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  title: { fontSize: 15, fontWeight: "900", color: "#111" },
  sub: { marginTop: 4, fontSize: 12, color: "#6b7280" },
  meta: { marginTop: 6, fontSize: 12, color: "#111" },
  actions: { flexDirection: "row", gap: 10, alignItems: "center" },
  iconBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
  },
  empty: { padding: 18, alignItems: "center" },
  emptyTxt: { color: "#6b7280" },
});
