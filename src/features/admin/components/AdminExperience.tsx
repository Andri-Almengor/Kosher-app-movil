import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/theme/ThemeProvider";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type HeroAction = {
  label: string;
  icon: IconName;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
};

const toneMap = {
  catalog: { iconBg: "#eaf3ff", color: "#3662a7", label: "Catálogo" },
  directory: { iconBg: "#f3e8ff", color: "#9333ea", label: "Directorio" },
  cms: { iconBg: "#eaf2ff", color: "#2563eb", label: "CMS" },
  crm: { iconBg: "#fff1e8", color: "#f97316", label: "CRM" },
  ops: { iconBg: "#eef4ff", color: "#3662a7", label: "Operación" },
};

export function AdminModuleHero({
  eyebrow,
  title,
  subtitle,
  icon,
  total,
  totalLabel,
  tone = "catalog",
  actions = [],
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: IconName;
  total: number | string;
  totalLabel: string;
  tone?: "catalog" | "directory" | "cms" | "crm" | "ops";
  actions?: HeroAction[];
}) {
  const { palette: c } = useTheme();
  const meta = toneMap[tone];
  return (
    <View style={styles.sectionRoot}>
      <View style={styles.moduleHeader}>
        <View style={[styles.moduleIcon, { backgroundColor: meta.iconBg }]}><Ionicons name={icon} size={22} color={meta.color} /></View>
        <View style={styles.moduleTitleWrap}>
          <Text style={styles.moduleEyebrow}>{eyebrow || meta.label}</Text>
          <Text style={styles.moduleTitle}>{title}</Text>
          <Text style={styles.moduleSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.moduleCounter}>
          <Text style={styles.moduleCounterValue}>{total}</Text>
          <Text style={styles.moduleCounterLabel}>{totalLabel}</Text>
        </View>
      </View>
      {actions.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroActions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              disabled={action.disabled}
              style={[styles.heroAction, action.primary && { backgroundColor: c.primary, borderColor: c.primary }, action.disabled && { opacity: 0.55 }]}
            >
              <Ionicons name={action.icon} size={17} color={action.primary ? "#fff" : c.primary} />
              <Text style={[styles.heroActionText, { color: action.primary ? "#fff" : c.primary }]}>{action.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

export function AdminCommandBar({ value, onChangeText, placeholder, chips = [], actions = [] }: { value: string; onChangeText: (value: string) => void; placeholder: string; chips?: string[]; actions?: HeroAction[] }) {
  const { palette: c } = useTheme();
  return (
    <View style={styles.commandBlock}>
      <View style={styles.commandBar}> 
        <Ionicons name="search-outline" size={18} color="#64748b" />
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#64748b" style={styles.commandInput} />
        {!!value && <Pressable onPress={() => onChangeText("")} hitSlop={8}><Ionicons name="close-circle" size={18} color="#64748b" /></Pressable>}
      </View>
      {actions.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              disabled={action.disabled}
              style={[styles.commandAction, action.primary && { backgroundColor: c.primary, borderColor: c.primary }, action.disabled && { opacity: 0.55 }]}
            >
              <Ionicons name={action.icon} size={17} color={action.primary ? "#fff" : c.primary} />
              <Text style={[styles.commandActionText, { color: action.primary ? "#fff" : c.primary }]}>{action.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : chips.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {chips.map((chip) => <View key={chip} style={[styles.chip, { backgroundColor: c.card, borderColor: c.border }]}><Text style={styles.chipText}>{chip}</Text></View>)}
        </ScrollView>
      ) : null}
    </View>
  );
}

export function AdminMiniStatRow({ stats }: { stats: Array<{ label: string; value: string | number; icon: IconName }> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statRow}>
      {stats.map((item) => (
        <View key={item.label} style={styles.statCard}> 
          <View style={styles.statIcon}><Ionicons name={item.icon} size={17} color="#3662a7" /></View>
          <View>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionRoot: { margin: 10, marginBottom: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 20, padding: 14, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  moduleHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  moduleIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  moduleTitleWrap: { flex: 1, minWidth: 0 },
  moduleEyebrow: { color: "#64748b", fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  moduleTitle: { color: "#0f172a", fontSize: 20, fontWeight: "900", letterSpacing: -0.3 },
  moduleSubtitle: { color: "#64748b", fontWeight: "700", fontSize: 12, lineHeight: 18, marginTop: 4 },
  moduleCounter: { minWidth: 70, borderRadius: 16, backgroundColor: "#eef4ff", paddingHorizontal: 10, paddingVertical: 9, alignItems: "center" },
  moduleCounterValue: { color: "#3662a7", fontSize: 18, fontWeight: "900" },
  moduleCounterLabel: { color: "#3662a7", fontSize: 10, fontWeight: "800", marginTop: 1 },
  heroActions: { gap: 8, paddingTop: 14, paddingRight: 2 },
  heroAction: { minHeight: 40, borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  heroActionText: { fontWeight: "900", fontSize: 12 },
  commandBlock: { paddingHorizontal: 10, paddingBottom: 12 },
  commandBar: { minHeight: 50, borderRadius: 18, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#fff", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  commandInput: { flex: 1, minHeight: 48, color: "#0f172a", fontWeight: "700" },
  chipsRow: { gap: 8, paddingTop: 10, paddingRight: 8 },
  commandAction: { minHeight: 40, borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  commandActionText: { fontWeight: "900", fontSize: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { color: "#64748b", fontWeight: "800", fontSize: 11 },
  statRow: { paddingHorizontal: 10, paddingBottom: 12, gap: 8 },
  statCard: { minWidth: 112, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#0f172a", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  statIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#eaf3ff", alignItems: "center", justifyContent: "center" },
  statValue: { color: "#0f172a", fontWeight: "900", fontSize: 16 },
  statLabel: { color: "#64748b", fontWeight: "800", fontSize: 10, marginTop: 1 },
  fab: { position: "absolute", right: 18, minWidth: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 17, shadowColor: "#0f172a", shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8, zIndex: 30 },
  fabLabel: { color: "#fff", fontWeight: "900", fontSize: 12 },
  savingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.18)", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 80 },
  savingCard: { width: "100%", maxWidth: 320, borderRadius: 22, backgroundColor: "#fff", padding: 18, shadowColor: "#0f172a", shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 9 },
  savingTrack: { height: 6, borderRadius: 999, backgroundColor: "#e2e8f0", overflow: "hidden", marginBottom: 14 },
  savingFill: { width: "68%", height: "100%", borderRadius: 999, backgroundColor: "#3662a7" },
  savingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  savingText: { color: "#0f172a", fontWeight: "900", fontSize: 14 },
});

export function AdminFloatingActionButton({ icon = "add-outline", label, onPress, bottom = 24 }: { icon?: IconName; label?: string; onPress: () => void; bottom?: number }) {
  const { palette: c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label ?? "Crear"} style={[styles.fab, { backgroundColor: c.primary, bottom }]}> 
      <Ionicons name={icon} size={24} color="#fff" />
      {label ? <Text style={styles.fabLabel}>{label}</Text> : null}
    </Pressable>
  );
}

export function AdminSavingOverlay({ visible, label = "Guardando..." }: { visible: boolean; label?: string }) {
  if (!visible) return null;
  return (
    <View pointerEvents="auto" style={styles.savingOverlay}>
      <View style={styles.savingCard}>
        <View style={styles.savingTrack}><View style={styles.savingFill} /></View>
        <View style={styles.savingRow}>
          <Ionicons name="cloud-upload-outline" size={18} color="#3662a7" />
          <Text style={styles.savingText}>{label}</Text>
        </View>
      </View>
    </View>
  );
}
