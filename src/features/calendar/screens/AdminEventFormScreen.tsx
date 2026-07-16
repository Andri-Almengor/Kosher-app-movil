import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  Platform,
  Switch,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import Card from "@/ui/Card";
import Input from "@/ui/Input";
import Button from "@/ui/Button";
import Ionicons from "@expo/vector-icons/Ionicons";


import { useI18n } from "@/i18n/I18nProvider";
import {  createEventAdmin,
  updateEventAdmin,
  type CalendarEvent,
} from "@/features/calendar/api/calendarApi";

type RouteParams = {
  mode: "create" | "edit";
  event?: CalendarEvent;
};

function safeDateFromIso(iso?: string | null): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date() : d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "2-digit" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(d: Date) {
  return `${fmtDate(d)} • ${fmtTime(d)}`;
}

export default function AdminEventFormScreen() {
  const { t } = useI18n();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { mode, event } = (route.params ?? {}) as RouteParams;

  const qc = useQueryClient();

  const [titulo, setTitulo] = useState(event?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(event?.descripcion ?? "");
  const [ubicacion, setUbicacion] = useState(event?.ubicacion ?? "");
  const [todoElDia, setTodoElDia] = useState<boolean>(event?.todoElDia ?? false);

  const [inicio, setInicio] = useState<Date>(() => safeDateFromIso(event?.inicio));
  const [fin, setFin] = useState<Date | null>(() => (event?.fin ? safeDateFromIso(event.fin) : null));

  const [showPicker, setShowPicker] = useState<null | "startDate" | "startTime" | "endDate" | "endTime">(null);

  const isEdit = mode === "edit";

  const createMut = useMutation({
    mutationFn: (payload: any) => createEventAdmin(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["calendar-events-admin"] });
      await qc.invalidateQueries({ queryKey: ["calendar-events"] });
      Alert.alert("Listo", "Evento creado");
      nav.goBack();
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "No se pudo crear"),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: number; payload: any }) => updateEventAdmin(vars.id, vars.payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["calendar-events-admin"] });
      await qc.invalidateQueries({ queryKey: ["calendar-events"] });
      Alert.alert("Listo", "Evento actualizado");
      nav.goBack();
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "No se pudo actualizar"),
  });

  const canSave = useMemo(() => titulo.trim().length > 0 && !!inicio, [titulo, inicio]);

  const onSave = () => {
    const t = titulo.trim();
    if (!t) {
      Alert.alert("Falta título", "El título es obligatorio.");
      return;
    }

    const start = inicio;
    if (isNaN(start.getTime())) {
      Alert.alert("Fecha inválida", "El inicio del evento es inválido.");
      return;
    }

    // Si es todo el día, normalizamos: inicio 00:00 y fin 23:59 (opcional)
    let startToSend = start;
    let endToSend: Date | null = fin;

    if (todoElDia) {
      const s = new Date(start);
      s.setHours(0, 0, 0, 0);
      startToSend = s;

      // Si no hay fin, lo ponemos al final del mismo día
      const e = new Date(s);
      e.setHours(23, 59, 0, 0);
      endToSend = e;
    } else {
      // Validación si hay fin
      if (endToSend) {
        if (isNaN(endToSend.getTime())) {
          Alert.alert("Fecha inválida", "La fecha fin es inválida.");
          return;
        }
        if (endToSend.getTime() < startToSend.getTime()) {
          Alert.alert("Fechas", "La fecha fin no puede ser menor que inicio.");
          return;
        }
      }
    }

    const payload = {
      titulo: t,
      descripcion: descripcion.trim() ? descripcion.trim() : null,
      ubicacion: ubicacion.trim() ? ubicacion.trim() : null,
      inicio: startToSend.toISOString(),
      fin: endToSend ? endToSend.toISOString() : null,
      todoElDia,
    };

    if (!isEdit) {
      createMut.mutate(payload);
      return;
    }

    if (!event?.id) {
      Alert.alert("Error", "No se recibió el evento a editar.");
      return;
    }

    updateMut.mutate({ id: event.id, payload });
  };

  const onPickStart = (e: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setShowPicker(null);
    if (e.type !== "set" || !date) return;

    // Mantener hora si se cambió solo fecha, o mantener fecha si se cambió hora
    const next = new Date(inicio);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setInicio(next);
  };

  const onPickStartTime = (e: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setShowPicker(null);
    if (e.type !== "set" || !date) return;

    const next = new Date(inicio);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setInicio(next);
  };

  const onPickEnd = (e: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setShowPicker(null);
    if (e.type !== "set" || !date) return;

    const base = fin ?? new Date(inicio);
    const next = new Date(base);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setFin(next);
  };

  const onPickEndTime = (e: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setShowPicker(null);
    if (e.type !== "set" || !date) return;

    const base = fin ?? new Date(inicio);
    const next = new Date(base);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setFin(next);
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>{isEdit ? "Editar evento" : t("createEvent")}</Text>
        <Text style={styles.subtitle}>
          Completa los campos. La fecha se elige con botones, no hay que escribir.
        </Text>

        <Text style={styles.label}>{t("titleRequired")}</Text>
        <Input value={titulo} onChangeText={setTitulo} placeholder="Ej: Torneo, reunión, feria..." />

        <Text style={styles.label}>{t("description")}</Text>
        <Input value={descripcion} onChangeText={setDescripcion} placeholder="Opcional" />

        <Text style={styles.label}>{t("location")}</Text>
        <Input value={ubicacion} onChangeText={setUbicacion} placeholder="Opcional" />

        {/* Todo el día */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>{t("allDay")}</Text>
            <Text style={styles.switchHint}>
              Si activas esto, no te pedirá horas y se tomará el día completo.
            </Text>
          </View>
          <Switch value={todoElDia} onValueChange={setTodoElDia} />
        </View>

        {/* Inicio */}
        <Text style={styles.sectionTitle}>{t("start")}</Text>
        <View style={styles.pickerRow}>
          <Pressable style={styles.pickerBtn} onPress={() => setShowPicker("startDate")}>
            <Ionicons name="calendar-outline" size={18} color="#111" />
            <Text style={styles.pickerTxt}>{fmtDate(inicio)}</Text>
          </Pressable>

          {!todoElDia && (
            <Pressable style={styles.pickerBtn} onPress={() => setShowPicker("startTime")}>
              <Ionicons name="time-outline" size={18} color="#111" />
              <Text style={styles.pickerTxt}>{fmtTime(inicio)}</Text>
            </Pressable>
          )}
        </View>

        {/* Fin */}
        <Text style={styles.sectionTitle}>{t("endOptional")}</Text>
        <View style={styles.pickerRow}>
          <Pressable
            style={[styles.pickerBtn, fin ? null : styles.pickerBtnGhost]}
            onPress={() => setShowPicker("endDate")}
          >
            <Ionicons name="calendar-outline" size={18} color="#111" />
            <Text style={styles.pickerTxt}>{fin ? fmtDate(fin) : "Elegir fecha fin"}</Text>
          </Pressable>

          {!todoElDia && (
            <Pressable
              style={[styles.pickerBtn, fin ? null : styles.pickerBtnGhost]}
              onPress={() => setShowPicker("endTime")}
            >
              <Ionicons name="time-outline" size={18} color="#111" />
              <Text style={styles.pickerTxt}>{fin ? fmtTime(fin) : "Elegir hora fin"}</Text>
            </Pressable>
          )}
        </View>

        {!!fin && (
          <Pressable
            style={styles.clearBtn}
            onPress={() => setFin(null)}
          >
            <Ionicons name="close-circle-outline" size={18} color="#111" />
            <Text style={styles.clearTxt}>{t("removeEnd")}</Text>
          </Pressable>
        )}

        <View style={{ height: 10 }} />

        <Button
          title={isEdit ? "Guardar cambios" : t("createEvent")}
          onPress={onSave}
          disabled={!canSave || createMut.isPending || updateMut.isPending}
        />

        <Text style={styles.preview}>
          Vista previa:{" "}
          <Text style={{ fontWeight: "900" }}>
            {todoElDia ? fmtDate(inicio) : fmtDateTime(inicio)}
          </Text>
          {fin ? (
            <Text>
              {"  "}→{"  "}
              <Text style={{ fontWeight: "900" }}>
                {todoElDia ? fmtDate(fin) : fmtDateTime(fin)}
              </Text>
            </Text>
          ) : null}
        </Text>
      </Card>

      {/* Pickers */}
      {showPicker === "startDate" && (
        <DateTimePicker value={inicio} mode="date" onChange={onPickStart} />
      )}
      {showPicker === "startTime" && (
        <DateTimePicker value={inicio} mode="time" onChange={onPickStartTime} />
      )}
      {showPicker === "endDate" && (
        <DateTimePicker value={fin ?? inicio} mode="date" onChange={onPickEnd} />
      )}
      {showPicker === "endTime" && (
        <DateTimePicker value={fin ?? inicio} mode="time" onChange={onPickEndTime} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 12 },
  card: { padding: 12 },

  title: { fontSize: 16, fontWeight: "900", color: "#111" },
  subtitle: { marginTop: 6, fontSize: 12, color: "#6b7280", lineHeight: 16 },

  label: { marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: "900", color: "#374151" },

  sectionTitle: { marginTop: 14, marginBottom: 8, fontSize: 13, fontWeight: "900", color: "#111" },

  pickerRow: { flexDirection: "row", gap: 10 },
  pickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  pickerBtnGhost: {
    backgroundColor: "#fafafa",
    borderStyle: "dashed",
  },
  pickerTxt: { fontSize: 12, fontWeight: "800", color: "#111" },

  clearBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  clearTxt: { fontSize: 12, fontWeight: "900", color: "#111" },

  switchRow: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  switchTitle: { fontSize: 13, fontWeight: "900", color: "#111" },
  switchHint: { marginTop: 4, fontSize: 12, color: "#6b7280", lineHeight: 16 },

  preview: { marginTop: 10, fontSize: 12, color: "#6b7280" },
});