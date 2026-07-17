import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, useWindowDimensions, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminStackParamList } from "@/navigation/AdminNavigator";
import { useAuth } from "@/app/auth/authStore";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { listAdminProductSeals, listAdminProducts } from "@/features/admin/api/adminProductsApi";
import { listRestaurants } from "@/features/admin/api/adminRestaurantsApi";
import { listNews } from "@/features/admin/api/adminNewsApi";
import { listAdminUsers } from "@/features/admin/api/adminUsersApi";

type Nav = NativeStackNavigationProp<AdminStackParamList>;
type IconName = React.ComponentProps<typeof Ionicons>["name"];

type KpiItem = {
  key: keyof AdminStackParamList;
  title: string;
  value: number;
  helper: string;
  icon: IconName;
  iconBg: string;
  iconColor: string;
};

type QuickAction = {
  label: string;
  icon: IconName;
  target: keyof AdminStackParamList;
};

type ModuleItem = {
  key: keyof AdminStackParamList;
  title: string;
  description: string;
  meta: string;
  icon: IconName;
  iconBg: string;
  iconColor: string;
};

const queryConfig = { retry: 1, staleTime: 120_000, gcTime: 15 * 60_000, refetchOnMount: false, refetchOnWindowFocus: false } as const;

export default function AdminHomeScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<Nav>();
  const { palette: c } = useTheme();
  const qc = useQueryClient();
  const isAdmin = useAuth((s) => s.isAdmin());
  const logout = useAuth((s) => s.logout);
  const token = useAuth((s) => s.token);
  const hydrated = useAuth((s) => s.hydrated);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState("");

  const twoColumns = width >= 340;

  const productsQ = useQuery({ queryKey: ["admin-products"], queryFn: listAdminProducts, enabled: hydrated && isAdmin && !!token, ...queryConfig });
  const restaurantsQ = useQuery({ queryKey: ["admin-restaurants"], queryFn: listRestaurants, enabled: hydrated && isAdmin && !!token, ...queryConfig });
  const newsQ = useQuery({ queryKey: ["admin-news"], queryFn: listNews, enabled: hydrated && isAdmin && !!token, ...queryConfig });
  const usersQ = useQuery({ queryKey: ["admin-users"], queryFn: listAdminUsers, enabled: hydrated && isAdmin && !!token, ...queryConfig });
  const sealsQ = useQuery({ queryKey: ["admin-product-seals"], queryFn: () => listAdminProductSeals({ includeInactive: true }), enabled: hydrated && isAdmin && !!token, ...queryConfig });

  const refreshing = productsQ.isFetching || restaurantsQ.isFetching || newsQ.isFetching || usersQ.isFetching || sealsQ.isFetching;
  const counts = {
    products: productsQ.data?.length ?? 0,
    restaurants: restaurantsQ.data?.length ?? 0,
    users: usersQ.data?.length ?? 0,
    news: newsQ.data?.length ?? 0,
    seals: sealsQ.data?.length ?? 0,
  };

  const go = (screen: keyof AdminStackParamList) => () => navigation.navigate(screen as never);

  const onRefresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-products"] });
    void qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    void qc.invalidateQueries({ queryKey: ["admin-news"] });
    void qc.invalidateQueries({ queryKey: ["admin-product-seals"] });
  };

  const kpis = useMemo<KpiItem[]>(() => [
    { key: "AdminProducts", title: "Productos", value: counts.products, helper: "Catálogo disponible", icon: "archive-outline", iconBg: "#eaf3ff", iconColor: "#3662a7" },
    { key: "AdminRestaurants", title: "Comercios", value: counts.restaurants, helper: "Negocios registrados", icon: "storefront-outline", iconBg: "#fff1e8", iconColor: "#f97316" },
    { key: "AdminUsers", title: "Usuarios", value: counts.users, helper: "Admin y colaboradores", icon: "people-outline", iconBg: "#f3e8ff", iconColor: "#9333ea" },
    { key: "AdminNews", title: "Novedades", value: counts.news, helper: "Publicaciones activas", icon: "calendar-outline", iconBg: "#eaf2ff", iconColor: "#2563eb" },
    { key: "AdminSeals", title: "Sellos", value: counts.seals, helper: "Certificaciones visuales", icon: "ribbon-outline", iconBg: "#ecfdf5", iconColor: "#059669" },
  ], [counts.products, counts.restaurants, counts.users, counts.news, counts.seals]);

  const quickActions = useMemo<QuickAction[]>(() => [
    { label: "Producto", icon: "add-circle-outline", target: "AdminProducts" },
    { label: "Comercio", icon: "business-outline", target: "AdminRestaurants" },
    { label: "Usuario", icon: "person-add-outline", target: "AdminUsers" },
    { label: "Novedad", icon: "document-text-outline", target: "AdminNews" },
    { label: "Sello", icon: "ribbon-outline", target: "AdminSeals" },
    { label: "Importar", icon: "swap-vertical-outline", target: "AdminProducts" },
  ], []);

  const modules = useMemo<ModuleItem[]>(() => [
    { key: "AdminProducts", title: "Catálogo de productos", description: "Productos, categorías, imágenes, sellos, importación y exportación.", meta: `${counts.products} registros`, icon: "cube-outline", iconBg: "#eaf3ff", iconColor: "#3662a7" },
    { key: "AdminRestaurants", title: "Comercios", description: "Ubicación, contacto, categorías y relación con productos.", meta: `${counts.restaurants} comercios`, icon: "storefront-outline", iconBg: "#fff1e8", iconColor: "#f97316" },
    { key: "AdminUsers", title: "Usuarios y permisos", description: "Roles, accesos, estado de cuenta y colaboradores.", meta: `${counts.users} usuarios`, icon: "people-outline", iconBg: "#f3e8ff", iconColor: "#9333ea" },
    { key: "AdminNews", title: "Novedades", description: "Publicaciones, anuncios, imágenes y contenido editorial.", meta: `${counts.news} novedades`, icon: "newspaper-outline", iconBg: "#eaf2ff", iconColor: "#2563eb" },
    { key: "AdminSeals", title: "Sellos de certificación", description: "Nombres, imágenes de Cloudinary, estado y relación con productos.", meta: `${counts.seals} sellos`, icon: "ribbon-outline", iconBg: "#ecfdf5", iconColor: "#059669" },
  ], [counts.products, counts.restaurants, counts.users, counts.news, counts.seals]);

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(q));
  }, [modules, search]);

  if (!hydrated) {
    return <View style={[styles.center, { backgroundColor: "#f8fafc" }]}><ActivityIndicator /></View>;
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#f8fafc" }]}> 
        <View style={[styles.blockedCard, { backgroundColor: c.card, borderColor: c.border }]}> 
          <Ionicons name="shield-outline" size={28} color={c.primary} />
          <Text style={[styles.blockedTitle, { color: c.text }]}>{t("adminZone")}</Text>
          <Text style={[styles.blockedCopy, { color: c.muted }]}>No tienes permisos para entrar a este panel.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.container}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 86 }]}
      >
        <View style={styles.topHeader}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.brand}>Kosher Costa Rica</Text>
            <Text style={styles.headerSub}>Panel administrativo</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconOnly} onPress={go("AdminLogs")} hitSlop={10}><Ionicons name="settings-outline" size={21} color="#0f172a" /></Pressable>
            <Pressable style={styles.avatar} onPress={logout}><Ionicons name="person" size={17} color="#fff" /></Pressable>
          </View>
        </View>

        <View style={styles.introBlock}>
          <Text style={styles.introEyebrow}>Gestiona el contenido</Text>
          <Text style={styles.introCopy}>Bienvenido de nuevo. Todo está listo para administrar Kosher Costa Rica.</Text>
        </View>

        <View style={styles.searchShell}>
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar productos, comercios, usuarios, novedades o sellos"
            placeholderTextColor="#64748b"
            style={styles.searchInput}
          />
          {!!search && <Pressable onPress={() => setSearch("")} hitSlop={8}><Ionicons name="close-circle" size={18} color="#64748b" /></Pressable>}
        </View>

        <View style={[styles.kpiGrid, !twoColumns && styles.singleGrid]}>
          {kpis.map((item) => <KpiCard key={item.key} item={item} onPress={go(item.key)} />)}
        </View>

        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
          {quickActions.map((item) => <QuickActionButton key={item.label} item={item} onPress={go(item.target)} />)}
        </ScrollView>

        <Text style={styles.sectionTitle}>Módulos administrativos</Text>
        <View style={styles.moduleList}>
          {filteredModules.map((item) => <ModuleCard key={item.key} item={item} onPress={go(item.key)} />)}
        </View>

        <Pressable style={styles.backHome} onPress={() => navigation.getParent()?.dispatch(CommonActions.navigate({ name: "Tabs", params: { screen: "Inicio" } }))}>
          <Ionicons name="home-outline" size={18} color="#3662a7" />
          <Text style={styles.backHomeText}>{t("backHome")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiCard({ item, onPress }: { item: KpiItem; onPress: () => void }) {
  return (
    <Pressable style={styles.kpiCard} onPress={onPress}>
      <View style={[styles.kpiIcon, { backgroundColor: item.iconBg }]}><Ionicons name={item.icon} size={20} color={item.iconColor} /></View>
      <Text style={styles.kpiTitle}>{item.title}</Text>
      <Text style={styles.kpiValue}>{item.value}</Text>
      <Text style={styles.kpiHelper}>{item.helper}</Text>
    </Pressable>
  );
}

function QuickActionButton({ item, onPress }: { item: QuickAction; onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}><Ionicons name={item.icon} size={20} color="#3662a7" /></View>
      <Text numberOfLines={1} style={styles.quickLabel}>{item.label}</Text>
    </Pressable>
  );
}

function ModuleCard({ item, onPress }: { item: ModuleItem; onPress: () => void }) {
  return (
    <Pressable style={styles.moduleCard} onPress={onPress}>
      <View style={[styles.moduleIcon, { backgroundColor: item.iconBg }]}><Ionicons name={item.icon} size={20} color={item.iconColor} /></View>
      <View style={styles.moduleBody}>
        <Text style={styles.moduleTitle}>{item.title}</Text>
        <Text style={styles.moduleDescription}>{item.description}</Text>
        <Text style={styles.moduleMeta}>{item.meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#64748b" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { paddingHorizontal: 10, paddingTop: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topHeader: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, marginBottom: 16 },
  headerTextWrap: { flex: 1 },
  brand: { fontSize: 16, color: "#1d4f91", fontWeight: "900", letterSpacing: -0.2 },
  headerSub: { marginTop: 1, color: "#64748b", fontSize: 11, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconOnly: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#1f5b83", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#dbeafe" },
  introBlock: { marginBottom: 14 },
  introEyebrow: { fontSize: 16, color: "#0f172a", fontWeight: "500", marginBottom: 6 },
  introCopy: { color: "#0f172a", fontSize: 15, lineHeight: 21 },
  searchShell: { height: 50, backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 18, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  searchInput: { flex: 1, height: 48, color: "#0f172a", fontWeight: "600" },
  opsCard: { backgroundColor: "#3662a7", borderRadius: 18, padding: 18, marginBottom: 18, shadowColor: "#0f172a", shadowOpacity: 0.13, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 5 },
  opsHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  opsIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  opsTitle: { color: "#fff", fontSize: 15, fontWeight: "900" },
  opsCopy: { color: "#fff", opacity: 0.96, fontWeight: "800", fontSize: 14, lineHeight: 21, marginTop: 10 },
  opsFooter: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18 },
  syncPill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 13, height: 38, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  syncText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  updateBtn: { height: 38, paddingHorizontal: 22, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  updateText: { color: "#164886", fontWeight: "900", fontSize: 13 },
  updatedText: { color: "rgba(255,255,255,0.72)", marginTop: 12, fontSize: 11, fontWeight: "700" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  singleGrid: { flexDirection: "column" },
  kpiCard: { width: "48.45%", minHeight: 126, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 18, padding: 16, shadowColor: "#0f172a", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  kpiIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  kpiTitle: { color: "#334155", fontSize: 14, fontWeight: "600", marginBottom: 8 },
  kpiValue: { color: "#0f172a", fontSize: 16, fontWeight: "800" },
  kpiHelper: { color: "#047857", fontSize: 10, fontWeight: "900", marginTop: 7 },
  sectionTitle: { color: "#0f172a", fontSize: 15, fontWeight: "600", marginBottom: 10, marginTop: 4 },
  quickScroll: { gap: 18, paddingHorizontal: 4, paddingBottom: 18 },
  quickAction: { alignItems: "center", width: 54 },
  quickIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center", justifyContent: "center", shadowColor: "#0f172a", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  quickLabel: { color: "#334155", fontSize: 12, marginTop: 8, fontWeight: "600" },
  moduleList: { gap: 10, marginBottom: 16 },
  moduleCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#0f172a", shadowOpacity: 0.045, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  moduleIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  moduleBody: { flex: 1, minWidth: 0 },
  moduleTitle: { color: "#0f172a", fontWeight: "900", fontSize: 14 },
  moduleDescription: { color: "#64748b", fontSize: 12, lineHeight: 17, marginTop: 3 },
  moduleMeta: { color: "#3662a7", fontWeight: "900", fontSize: 11, marginTop: 7 },
  twoSections: { gap: 12 },
  activityCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 18, padding: 14, shadowColor: "#0f172a", shadowOpacity: 0.045, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitleInline: { color: "#0f172a", fontWeight: "900", fontSize: 14 },
  activityItem: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#3662a7", marginTop: 5 },
  activityText: { flex: 1, color: "#64748b", lineHeight: 18, fontSize: 12, fontWeight: "700" },
  emptyText: { color: "#64748b", lineHeight: 18, fontSize: 12, fontWeight: "700" },
  pendingItem: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  pendingLabel: { flex: 1, color: "#334155", fontSize: 12, fontWeight: "700" },
  pendingValue: { color: "#0f172a", fontSize: 12, fontWeight: "900" },
  backHome: { marginTop: 14, height: 48, borderRadius: 16, backgroundColor: "#eef4ff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  backHomeText: { color: "#3662a7", fontWeight: "900" },
  blockedCard: { margin: 18, borderWidth: 1, borderRadius: 20, padding: 18, alignItems: "center" },
  blockedTitle: { marginTop: 10, fontSize: 18, fontWeight: "900" },
  blockedCopy: { marginTop: 6, textAlign: "center" },
});
