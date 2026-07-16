import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/api/client";
import { openAssetUrl } from "@/lib/openAsset";
import FullscreenImageModal from "@/components/FullscreenImageModal";

type NewsItem = {
  id: number;
  titulo: string;
  contenido?: string | null;
  imageUrl?: string | null;
  fileUrl?: string | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
};

async function getNewsById(id: number): Promise<NewsItem> {
  const { data } = await api.get<NewsItem>(`/noticias/${id}`);
  return data;
}

function safeDateLabel(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}



// ⚠️ Si ya tienes tipado global de navegación, puedes reemplazar esto por tu tipo real.
type NewsStackParamList = {
  News: undefined;
  NewsDetail: { id: number };
};

export default function NewsDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [imageOpen, setImageOpen] = useState(false);
  const route = useRoute<RouteProp<NewsStackParamList, "NewsDetail">>();

  const id = route.params?.id;

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["news-detail", id],
    queryFn: () => getNewsById(Number(id)),
    enabled: Number.isFinite(Number(id)) && Number(id) > 0,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const dateLabel = useMemo(() => {
    if (!data) return "";
    return safeDateLabel(data.actualizadoEn ?? data.creadoEn);
  }, [data]);

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: Math.max(insets.top, 10) }]}>
        <ActivityIndicator />
        <Text style={styles.centerSub}>Cargando noticia…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.center, { paddingTop: Math.max(insets.top, 10) }]}>
        <Ionicons name="alert-circle-outline" size={30} />
        <Text style={styles.centerTitle}>No se pudo cargar</Text>
        <Text style={styles.centerSub}>Reintenta o vuelve atrás.</Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <Pressable style={styles.secondaryBtn} hitSlop={10} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={22} />
            <Text style={styles.secondaryBtnTxt}>Volver</Text>
          </Pressable>

          <Pressable style={styles.primaryBtn} hitSlop={10} onPress={() => refetch()}>
            <Ionicons name="refresh-outline" size={22} color="#fff" />
            <Text style={styles.primaryBtnTxt}>Reintentar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={24} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Noticia
          </Text>
          <Text style={styles.headerSub}>
            {isFetching ? "Actualizando…" : dateLabel}
          </Text>
        </View>

        <Pressable style={styles.iconBtn} hitSlop={12} onPress={() => refetch()}>
          <Ionicons name="refresh-outline" size={24} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Imagen */}
        {!!data.imageUrl && (
          <Pressable onPress={() => setImageOpen(true)} style={styles.heroWrap} accessibilityRole="button" accessibilityLabel="Ver imagen completa">
            <Image source={{ uri: data.imageUrl }} style={styles.heroImg} resizeMode="cover" />
            <View style={styles.heroBadge}>
              <Ionicons name="expand-outline" size={16} color="#fff" />
              <Text style={styles.heroBadgeTxt}>Ver completa</Text>
            </View>
          </Pressable>
        )}

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.title}>{data.titulo}</Text>

          {!!dateLabel && (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color="#6b7280" />
              <Text style={styles.metaTxt}>{dateLabel}</Text>
            </View>
          )}

          {!!data.contenido && <Text style={styles.content}>{data.contenido}</Text>}

          {/* Botones */}
          <View style={styles.actionsRow}>
            {!!data.fileUrl && (
              <Pressable style={styles.actionBtn} onPress={() => openAssetUrl(data.fileUrl)}>
                <Ionicons name="document-outline" size={16} />
                <Text style={styles.actionTxt}>Abrir archivo adjunto</Text>
              </Pressable>
            )}

            {!!data.imageUrl && (
              <Pressable style={styles.actionBtn} onPress={() => setImageOpen(true)}>
                <Ionicons name="image-outline" size={16} />
                <Text style={styles.actionTxt}>Abrir imagen</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      <FullscreenImageModal
        visible={imageOpen}
        uri={data.imageUrl}
        title={data.titulo ?? "Imagen de la noticia"}
        onClose={() => setImageOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 12 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18, gap: 8 },
  centerTitle: { fontSize: 19, fontWeight: "900", color: "#111" },
  centerSub: { color: "#6b7280", textAlign: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 19, fontWeight: "900", color: "#111" },
  headerSub: { marginTop: 2, fontSize: 15, color: "#6b7280", fontWeight: "700" },

  iconBtn: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },

  heroWrap: {
    marginTop: 12,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#f3f4f6",
  },
  heroImg: { width: "100%", height: 200 },
  heroBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(17,17,17,0.85)",
    borderRadius: 999,
    minHeight: 42,
    paddingVertical: 8,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroBadgeTxt: { color: "#fff", fontWeight: "900", fontSize: 15 },

  body: { paddingTop: 14, paddingHorizontal: 2 },
  title: { fontSize: 21, fontWeight: "900", color: "#111" },

  metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  metaTxt: { fontSize: 15, color: "#6b7280", fontWeight: "700" },

  content: { marginTop: 14, fontSize: 17, color: "#374151", lineHeight: 20 },

  actionsRow: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#eee",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  actionTxt: { fontSize: 15, fontWeight: "900", color: "#111" },

  primaryBtn: {
    backgroundColor: "#111",
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "900", fontSize: 16 },

  secondaryBtn: {
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryBtnTxt: { color: "#111", fontWeight: "900", fontSize: 16 },
});
