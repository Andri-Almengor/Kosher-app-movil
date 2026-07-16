import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "react-native-calendars";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getExpoNotifications, shouldUseExpoNotifications } from "@/lib/notifications/expoNotificationsSafe";

import { useAuth } from "@/app/auth/authStore";
import { listEvents, type CalendarEvent } from "@/features/calendar/api/calendarApi";
import {
  listSubscribedEventIds,
  setEventSubscribed,
  removeEventSubscribed,
  getUserSubscriptions,
} from "@/features/calendar/storage/subscriptions";

type MarkedDates = Record<string, any>;

function toDateKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeDate(input: string) {
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

async function ensureNotificationPermission() {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return false;

  const settings = await Notifications.getPermissionsAsync();
  if (settings.status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    if (req.status !== "granted") return false;
  }
  return true;
}

export default function CalendarScreen() {
  // ✅ Hook dentro del componente
  const { user } = useAuth() as any; // si tienes types, cámbialo por tu tipo real
  const userId = user?.id ?? "guest";

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [subscribedIds, setSubscribedIds] = useState<number[]>([]);

  // ✅ Cargar suscripciones SOLO del usuario actual
  useEffect(() => {
    (async () => {
      const ids = await listSubscribedEventIds(userId);
      setSubscribedIds(ids);
    })();
  }, [userId]);

  // ✅ Traer eventos del mes visible
  const { data: events = [], refetch, isFetching, isLoading, error } = useQuery({
    queryKey: [
      "calendar-events",
      toDateKey(startOfMonth(currentMonth)),
      toDateKey(endOfMonth(currentMonth)),
    ],
    queryFn: async () => {
      const from = startOfMonth(currentMonth).toISOString();
      const to = endOfMonth(currentMonth).toISOString();
      return listEvents({ from, to });
    },
  });

  // Agrupar por día (local)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d = safeDate(ev.inicio);
      if (!d) continue;
      const key = toDateKey(d);
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a: CalendarEvent, b: CalendarEvent) => {
        const ta = new Date(a.inicio).getTime();
        const tb = new Date(b.inicio).getTime();
        return ta - tb;
      });
      map.set(k, arr);
    }

    return map;
  }, [events]);

  // Marcas: dots en días con eventos + seleccionado
  const markedDates: MarkedDates = useMemo(() => {
    const marks: MarkedDates = {};

    for (const [dateKey, dayEvents] of eventsByDay.entries()) {
      const hasReminder = dayEvents.some((ev) => subscribedIds.includes(ev.id));
      marks[dateKey] = {
        marked: true,
        dotColor: hasReminder ? "#7c3aed" : "#111",
      };
    }

    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: "#111",
    };

    return marks;
  }, [eventsByDay, selectedDate, subscribedIds]);

  const selectedEvents = useMemo(() => {
    return eventsByDay.get(selectedDate) ?? [];
  }, [eventsByDay, selectedDate]);

  // Próximos eventos del mes (fallback)
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events
      .map((e) => ({ e, t: new Date(e.inicio).getTime() }))
      .filter((x) => !isNaN(x.t) && x.t >= now)
      .sort((a, b) => a.t - b.t)
      .slice(0, 8)
      .map((x) => x.e);
  }, [events]);

  // ✅ Alterna recordatorio PERSONAL por usuario
  const toggleReminder = async (ev: CalendarEvent) => {
    try {
      const start = safeDate(ev.inicio);
      if (!start) {
        Alert.alert("Error", "La fecha del evento no es válida.");
        return;
      }

      const now = Date.now();
      const millisStart = start.getTime();
      const currentlySubscribed = subscribedIds.includes(ev.id);

      const Notifications = await getExpoNotifications();

      // Si ya está suscrito -> quitar recordatorio (cancelar notificación + borrar del storage)
      if (currentlySubscribed) {
        const map = await getUserSubscriptions(userId);
        const prev = (map as any)[ev.id];

        if (prev?.notificationId && Notifications) {
          try {
            await Notifications.cancelScheduledNotificationAsync(prev.notificationId);
          } catch {
            // si ya no existía, no pasa nada
          }
        }

        await removeEventSubscribed(userId, ev.id);

        const ids = await listSubscribedEventIds(userId);
        setSubscribedIds(ids);

        Alert.alert("Listo", "Se desactivó el recordatorio.");
        return;
      }

      // Activar recordatorio
      if (millisStart <= now) {
        Alert.alert("Evento ya pasó", "Este evento ya ocurrió o está en progreso.");
        return;
      }

      if (!shouldUseExpoNotifications()) {
        Alert.alert(
          "Expo Go",
          "Los recordatorios del calendario no están disponibles en Expo Go. Para usarlos en Android necesitas un development build o APK."
        );
        return;
      }

      const ok = await ensureNotificationPermission();
      if (!ok || !Notifications) {
        Alert.alert("Permisos", "No se dieron permisos para notificaciones.");
        return;
      }

      // 24h antes; si no alcanza, 1h; si no alcanza, 10min.
      const diff = millisStart - now;
      let remindAt = new Date(millisStart - 24 * 60 * 60 * 1000);
      if (diff < 24 * 60 * 60 * 1000) remindAt = new Date(millisStart - 60 * 60 * 1000);
      if (diff < 60 * 60 * 1000) remindAt = new Date(millisStart - 10 * 60 * 1000);
      if (remindAt.getTime() <= now) remindAt = new Date(now + 10 * 1000);

      if (!remindAt || isNaN(remindAt.getTime())) {
        Alert.alert("Error", "No se pudo calcular la fecha del recordatorio.");
        return;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Recordatorio: ${ev.titulo}`,
          body: ev.ubicacion ? `Ubicación: ${ev.ubicacion}` : "Se acerca un evento marcado.",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: remindAt,
        },
      });

      await setEventSubscribed(userId, ev.id, {
        notificationId,
        remindAtISO: remindAt.toISOString(),
      });

      const ids = await listSubscribedEventIds(userId);
      setSubscribedIds(ids);

      Alert.alert("Listo", "Se activó el recordatorio para este evento.");
    } catch (e: unknown) {
      console.error(e);
      Alert.alert("Error", "No se pudo activar/desactivar el recordatorio.");
    }
  };

  const goToday = () => {
    const d = new Date();
    setSelectedDate(toDateKey(d));
    setCurrentMonth(d);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.loadingTxt}>Cargando calendario…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingTxt}>No se pudieron cargar los eventos.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => refetch()}>
          <Text style={styles.primaryBtnTxt}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const listData = selectedEvents.length > 0 ? selectedEvents : upcomingEvents;
  const listTitle = selectedEvents.length > 0 ? `Eventos del ${selectedDate}` : "Próximos eventos";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Calendario</Text>

        <View style={styles.topActions}>
          <Pressable style={styles.chipBtn} onPress={goToday}>
            <Ionicons name="today-outline" size={16} />
            <Text style={styles.chipTxt}>Hoy</Text>
          </Pressable>

          <Pressable style={styles.chipBtn} onPress={() => refetch()}>
            <Ionicons name="refresh-outline" size={16} />
            <Text style={styles.chipTxt}>{isFetching ? "..." : "Actualizar"}</Text>
          </Pressable>
        </View>
      </View>

      {/* Calendar */}
      <View style={styles.calendarWrap}>
        <Calendar
          markedDates={markedDates}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          onMonthChange={(m) => setCurrentMonth(new Date(m.year, m.month - 1, 1))}
          theme={{
            todayTextColor: "#111",
            arrowColor: "#111",
            selectedDayBackgroundColor: "#111",
            selectedDayTextColor: "#fff",
            textDayFontWeight: "600",
            textMonthFontWeight: "800",
            textDayHeaderFontWeight: "700",
          }}
        />
      </View>

      {/* List */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{listTitle}</Text>
        <Text style={styles.listHint}>
          {selectedEvents.length > 0
            ? "Toca un evento para activar/desactivar recordatorio (solo para tu usuario)."
            : "No hay eventos ese día. Aquí tienes los próximos."}
        </Text>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => {
          const start = safeDate(item.inicio);
          const dateLabel = start
            ? start.toLocaleString([], {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : item.inicio;

          const subscribed = subscribedIds.includes(item.id);

          return (
            <Pressable style={styles.card} onPress={() => toggleReminder(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.titulo}</Text>
                <Text style={styles.cardSub}>{item.todoElDia ? "Todo el día" : dateLabel}</Text>
                {!!item.ubicacion && <Text style={styles.cardMeta}>📍 {item.ubicacion}</Text>}
                {!!item.descripcion && <Text style={styles.cardDesc}>{item.descripcion}</Text>}
              </View>

              <View style={[styles.badge, subscribed && styles.badgeActive]}>
                <Ionicons
                  name={subscribed ? "notifications" : "notifications-outline"}
                  size={16}
                  color={subscribed ? "#fff" : "#111"}
                />
                <Text style={[styles.badgeTxt, subscribed && { color: "#fff" }]}>
                  {subscribed ? "Marcado" : "Recordar"}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>No hay eventos para mostrar.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  loadingTxt: { color: "#6b7280", fontWeight: "700" },

  topBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  topActions: { flexDirection: "row", gap: 8 },
  chipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#eee",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  chipTxt: { fontSize: 12, fontWeight: "800", color: "#111" },

  calendarWrap: { padding: 8 },

  listHeader: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 },
  listTitle: { fontSize: 15, fontWeight: "900", color: "#111" },
  listHint: { marginTop: 4, fontSize: 12, color: "#6b7280" },

  card: {
    marginHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#fff",
  },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#111" },
  cardSub: { marginTop: 4, fontSize: 12, color: "#6b7280" },
  cardMeta: { marginTop: 6, fontSize: 12, color: "#111" },
  cardDesc: { marginTop: 8, fontSize: 12, color: "#374151" },

  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeActive: {
    backgroundColor: "#111",
  },
  badgeTxt: { fontSize: 12, fontWeight: "900", color: "#111" },

  empty: { padding: 18, alignItems: "center" },
  emptyTxt: { color: "#6b7280" },

  primaryBtn: {
    marginTop: 10,
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "900" },
});
