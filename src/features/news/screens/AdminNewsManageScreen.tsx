import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  StyleSheet,
} from "react-native";
import { useI18n } from "@/i18n/I18nProvider";
import { AppFonts } from "@/theme/fonts";

type News = {
  id: string;
  title: string;
  body: string;
  category?: string;
  createdAt: string; // ISO
};

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export default function AdminNewsManageScreen() {
  const { t } = useI18n();
  // lista local SOLO para demo (no persiste)
  const [items, setItems] = useState<News[]>([
    {
      id: uid(),
      title: "Hola mundo",
      body: "Esta es una publicación de prueba del foro.",
      category: "Info",
      createdAt: now(),
    },
  ]);

  // formulario
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Info");
  const [editingId, setEditingId] = useState<string | null>(null);

  const isEditing = useMemo(() => !!editingId, [editingId]);

  const onSubmit = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Campos requeridos", "Título y contenido son obligatorios.");
      return;
    }

    if (isEditing && editingId) {
      setItems(prev =>
        prev.map(n =>
          n.id === editingId
            ? { ...n, title: title.trim(), body: body.trim(), category }
            : n
        )
      );
      setEditingId(null);
    } else {
      setItems(prev => [
        { id: uid(), title: title.trim(), body: body.trim(), category, createdAt: now() },
        ...prev,
      ]);
    }

    setTitle("");
    setBody("");
  };

  const onEdit = (id: string) => {
    const n = items.find(i => i.id === id);
    if (!n) return;
    setEditingId(id);
    setTitle(n.title);
    setBody(n.body);
    setCategory(n.category ?? "Info");
  };

  const onDelete = (id: string) => {
    Alert.alert("Eliminar", "¿Eliminar esta noticia?", [
      { text: t("cancel"), style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => setItems(prev => prev.filter(i => i.id !== id)),
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Formulario */}
      <View style={s.card}>
        <Text style={s.h6}>{isEditing ? "Editar noticia" : "Nueva noticia"}</Text>

        <TextInput
          style={s.input}
          placeholder={t("title")}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[s.input, { height: 100 }]}
          placeholder={t("content")}
          value={body}
          onChangeText={setBody}
          multiline
        />
        <TextInput
          style={s.input}
          placeholder="Categoría (Info/Promo/Alerta)"
          value={category}
          onChangeText={setCategory}
        />

        <Pressable onPress={onSubmit} style={s.btn}>
          <Text style={s.btnText}>{isEditing ? "Guardar cambios" : "Publicar"}</Text>
        </Pressable>
      </View>

      {/* Lista */}
      <FlatList
        data={[...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={1}>{item.title}</Text>
              <Text style={s.meta}>
                {item.category ?? "General"} · {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>

            <Pressable onPress={() => onEdit(item.id)} style={[s.smallBtn, { backgroundColor: "#2563EB" }]}>
              <Text style={s.smallBtnText}>Editar</Text>
            </Pressable>
            <Pressable onPress={() => onDelete(item.id)} style={[s.smallBtn, { backgroundColor: "#DC2626" }]}>
              <Text style={s.smallBtnText}>Borrar</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  h6: { fontSize: 14, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", letterSpacing: 0.2, color: "#111", marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff",
    fontFamily: AppFonts.poppinsRegular,
    fontFamily: AppFonts.poppinsRegular,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "#111", borderRadius: 10, height: 44,
    alignItems: "center", justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontFamily: AppFonts.poppinsMediumItalic},
  row: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", gap: 8,
  },
  title: { fontSize: 15, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", letterSpacing: 0.2, color: "#111" },
  meta: { fontSize: 12, fontFamily: AppFonts.poppinsRegular, color: "#6B7280", marginTop: 2 },
  smallBtn: {
    paddingHorizontal: 12, height: 36, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  smallBtnText: { color: "#fff", fontFamily: AppFonts.poppinsMediumItalic, fontSize: 12 },
});