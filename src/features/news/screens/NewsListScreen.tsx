import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  Image,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { useOfflineList } from "@/offline/useOfflineList";
import { CachedImage } from "@/components/CachedImage";

// ✅ Ajusta este tipo si tu backend devuelve más campos
type NewsItem = {
  id: number;
  titulo?: string | null;
  contenido?: string | null;
  imageUrl?: string | null;
  fileUrl?: string | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
};

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

function shortText(text?: string | null, max = 180) {
  if (!text) return "";
  const t = text.trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim() + "…";
}

async function openLink(url?: string | null) {
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    // silencioso
  }
}

export default function NewsListScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 10);
  const navigation = useNavigation<any>();

  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const { items: news = [], loading: isLoading, refreshing: isFetching, error, refresh } = useOfflineList<NewsItem>("noticias");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return news;
    return news.filter((n) => {
      const blob = `${n.titulo ?? ""} ${n.contenido ?? ""}`.toLowerCase();
      return blob.includes(s);
    });
  }, [news, q]);

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const goDetail = (id: number) => {
    navigation.navigate("NewsDetail", { id });
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: topPad }]}>
        <ActivityIndicator />
        <Text style={styles.centerSub}>Cargando noticias…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { paddingTop: topPad }]}>
        <Ionicons name="alert-circle-outline" size={28} />
        <Text style={styles.centerTitle}>No se pudieron cargar</Text>
        <Text style={styles.centerSub}>Revisa conexión/servidor y reintenta.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => refetch()}>
          <Text style={styles.primaryBtnTxt}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Noticias</Text>
          <Text style={styles.subTitle}>
            Actualizaciones y comunicados {isFetching ? "• actualizando…" : ""}
          </Text>
        </View>

        <Pressable style={styles.chipBtn} onPress={() => refetch()}>
          <Ionicons name="refresh-outline" size={16} />
          <Text style={styles.chipTxt}>Actualizar</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar noticias…"
          value={q}
          onChangeText={setQ}
          returnKeyType="search"
        />
        {!!q && (
          <Pressable onPress={() => setQ("")}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refresh} />
        }
        renderItem={({ item }) => {
          const isOpen = !!expanded[item.id];
          const dateLabel = safeDateLabel(item.actualizadoEn ?? item.creadoEn);

          return (
            <Pressable style={styles.card} onPress={() => goDetail(item.id)}>
              {/* Imagen (opcional) */}
              {!!item.imageUrl && (
                <Pressable
                  onPress={() => openLink(item.imageUrl)}
                  style={styles.imageWrap}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <View style={styles.imageBadge}>
                    <Ionicons name="image-outline" size={14} color="#fff" />
                    <Text style={styles.imageBadgeTxt}>Ver</Text>
                  </View>
                </Pressable>
              )}

              {/* Contenido */}
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.titulo?.trim() ? item.titulo : "(Sin título)"}
                  </Text>

                  {/* Botón rápido a detalle */}
                  <Pressable
                    style={styles.detailBtn}
                    onPress={() => goDetail(item.id)}
                  >
                    <Ionicons name="open-outline" size={16} color="#111" />
                  </Pressable>
                </View>

                {!!dateLabel && <Text style={styles.cardMeta}>{dateLabel}</Text>}

                {!!item.contenido && (
                  <Text style={styles.cardText}>
                    {isOpen ? item.contenido : shortText(item.contenido, 200)}
                  </Text>
                )}

                {/* Acciones */}
                <View style={styles.actionsRow}>
                  {!!item.contenido && (item.contenido?.length ?? 0) > 200 && (
                    <Pressable
                      style={styles.actionChip}
                      onPress={() => toggleExpanded(item.id)}
                    >
                      <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={16}
                      />
                      <Text style={styles.actionTxt}>
                        {isOpen ? "Ver menos" : "Leer más"}
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={styles.actionChipStrong}
                    onPress={() => goDetail(item.id)}
                  >
                    <Ionicons name="reader-outline" size={16} color="#fff" />
                    <Text style={styles.actionTxtStrong}>Ver detalle</Text>
                  </Pressable>

                  {!!item.fileUrl && (
                    <Pressable
                      style={styles.actionChip}
                      onPress={() => openLink(item.fileUrl)}
                    >
                      <Ionicons name="document-outline" size={16} />
                      <Text style={styles.actionTxt}>Abrir archivo</Text>
                    </Pressable>
                  )}

                  {!!item.imageUrl && (
                    <Pressable
                      style={styles.actionChip}
                      onPress={() => openLink(item.imageUrl)}
                    >
                      <Ionicons name="image-outline" size={16} />
                      <Text style={styles.actionTxt}>Abrir imagen</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="newspaper-outline" size={28} color="#6b7280" />
            <Text style={styles.emptyTitle}>No hay noticias</Text>
            <Text style={styles.emptySub}>
              Cuando se publiquen, aparecerán aquí automáticamente.
            </Text>
          </View>
        }
      />

      {/* Footer hint */}
      <View style={styles.footerHint}>
        <Ionicons name="pulse-outline" size={14} color="#6b7280" />
        <Text style={styles.footerHintTxt}>
          {Platform.OS === "web"
            ? "Auto-refresh activo."
            : "Auto-refresh activo (cada 20s)."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 12 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    gap: 8,
  },
  centerTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  centerSub: { color: "#6b7280", textAlign: "center" },

  header: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "900", color: "#111" },
  subTitle: { marginTop: 2, fontSize: 12, color: "#6b7280" },

  chipBtn: {
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
  chipTxt: { fontSize: 12, fontWeight: "800", color: "#111" },

  searchRow: {
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
  },
  searchInput: { flex: 1, padding: 0, fontWeight: "700", color: "#111" },

  card: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  imageWrap: { width: "100%", height: 160, backgroundColor: "#f3f4f6" },
  image: { width: "100%", height: "100%" },
  imageBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(17,17,17,0.85)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  imageBadgeTxt: { color: "#fff", fontWeight: "900", fontSize: 12 },

  cardBody: { padding: 12 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  detailBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: { flex: 1, fontSize: 15, fontWeight: "900", color: "#111" },
  cardMeta: { marginTop: 6, fontSize: 12, color: "#6b7280", fontWeight: "700" },
  cardText: { marginTop: 10, fontSize: 13, color: "#374151", lineHeight: 18 },

  actionsRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#eee",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  actionTxt: { fontSize: 12, fontWeight: "900", color: "#111" },

  actionChipStrong: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#111",
    backgroundColor: "#111",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  actionTxtStrong: { fontSize: 12, fontWeight: "900", color: "#fff" },

  empty: { padding: 20, alignItems: "center", gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  emptySub: { fontSize: 12, color: "#6b7280", textAlign: "center" },

  primaryBtn: {
    marginTop: 10,
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "900" },

  footerHint: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerHintTxt: { color: "#6b7280", fontSize: 12, fontWeight: "800" },
});
