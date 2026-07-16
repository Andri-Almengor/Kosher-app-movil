import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/app/auth/authStore";
import { useApiLogStore, type ApiLogItem } from "@/features/admin/logging/logStore";
import { useAppSettings } from "@/app/settings/appSettingsStore";
import { api } from "@/lib/api/client";

function formatTs(ts: number) {
  try {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return "";
  }
}

export default function AdminLogsScreen() {
  const { t } = useI18n();
  const { palette: c } = useTheme();
  const isAdmin = useAuth((s) => s.isAdmin());

  const logs = useApiLogStore((s) => s.logs);
  const clear = useApiLogStore((s) => s.clear);

  const savedOverride = useAppSettings((s) => s.apiBaseUrlOverride);
  const setOverride = useAppSettings((s) => s.setApiBaseUrlOverride);
  const clearOverride = useAppSettings((s) => s.clearApiBaseUrlOverride);

  const [q, setQ] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState(savedOverride ?? "");

  const currentBaseUrl = String(api.defaults.baseURL ?? "");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter((l) => {
      const m = `${l.message} ${JSON.stringify(l.meta ?? {})}`.toLowerCase();
      return m.includes(query);
    });
  }, [logs, q]);

  const exportLogs = async () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        baseURL: currentBaseUrl,
        count: logs.length,
        logs,
      };

      const filename = `kccr_logs_${Date.now()}.json`;

      // ✅ WEB
      if (Platform.OS === "web") {
        // @ts-ignore
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        // @ts-ignore
        const url = URL.createObjectURL(blob);
        // @ts-ignore
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        // @ts-ignore
        URL.revokeObjectURL(url);
        return;
      }

      const FS: any = FileSystem as any;
      const baseDir: string | null =
        (FS.documentDirectory as string | undefined) ??
        (FS.cacheDirectory as string | undefined) ??
        null;

      if (baseDir) {
        const uri = baseDir + filename;
        await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert(t("done"), `${t("fileCreated")}\n${t("savedAt")}: ${uri}`);
        }
        return;
      }

      Alert.alert(t("error"), t("exportFailed"));
    } catch {
      Alert.alert(t("error"), t("exportFailed"));
    }
  };

  const onSaveBaseUrl = () => {
    const v = baseUrlInput.trim();
    if (!v) {
      setOverride(null);
      Alert.alert(t("done"), t("resetBackendUrl"));
      return;
    }
    setOverride(v);
    Alert.alert(t("done"), t("saveBackendUrl"));
  };

  const onClearBaseUrl = () => {
    setBaseUrlInput("");
    clearOverride();
    Alert.alert(t("done"), t("resetBackendUrl"));
  };

  if (!isAdmin) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}> 
        <Text style={{ color: c.text, fontWeight: "900" }}>{t("adminOnly")}</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: ApiLogItem }) => {
    const color = item.level === "error" ? c.danger : c.text;
    return (
      <View style={[styles.logRow, { borderColor: c.border, backgroundColor: c.card }]}> 
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[styles.ts, { color: c.muted }]}>{formatTs(item.ts)}</Text>
          <Text style={[styles.level, { color }]}>{item.level.toUpperCase()}</Text>
        </View>
        <Text style={[styles.msg, { color: c.text }]}>{item.message}</Text>
        {!!item.meta && (
          <Text style={[styles.meta, { color: c.muted }]} numberOfLines={3}>
            {JSON.stringify(item.meta)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}> 
      <Text style={[styles.h1, { color: c.text }]}>{t("logs")}</Text>
      <Text style={[styles.sub, { color: c.muted }]}>{t("adminLogsDesc")}</Text>

      <View style={[styles.panel, { borderColor: c.border, backgroundColor: c.card }]}> 
        <Text style={[styles.label, { color: c.muted }]}>{t("backendUrl")}</Text>
        <Text style={[styles.currentUrl, { color: c.text }]} numberOfLines={1}>
          {currentBaseUrl || "-"}
        </Text>

        <TextInput
          value={baseUrlInput}
          onChangeText={setBaseUrlInput}
          placeholder={"http://192.168.x.x:4000  (o https://tu-backend.com)"}
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: c.text, borderColor: c.border }]}
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable style={[styles.btn, { borderColor: c.border }]} onPress={onSaveBaseUrl}>
            <Text style={[styles.btnText, { color: c.text }]}>{t("save")}</Text>
          </Pressable>
          <Pressable style={[styles.btn, { borderColor: c.border }]} onPress={onClearBaseUrl}>
            <Text style={[styles.btnText, { color: c.text }]}>{t("reset")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.actions}> 
        <Pressable style={[styles.actionBtn, { borderColor: c.border }]} onPress={exportLogs}>
          <Text style={[styles.actionText, { color: c.text }]}>{t("exportLogs")}</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { borderColor: c.border }]}
          onPress={() => {
            clear();
            Alert.alert(t("done"), t("clearLogs"));
          }}
        >
          <Text style={[styles.actionText, { color: c.text }]}>{t("clearLogs")}</Text>
        </Pressable>
      </View>

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t("search")}
        placeholderTextColor={c.muted}
        style={[styles.search, { color: c.text, borderColor: c.border }]}
      />

      <Text style={[styles.count, { color: c.muted }]}>
        {filtered.length} / {logs.length}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 24, fontWeight: "900" },
  sub: { marginTop: 4, marginBottom: 12, fontSize: 12, fontWeight: "700" },
  panel: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "800" },
  currentUrl: { marginTop: 4, fontSize: 12, fontWeight: "800" },
  input: { marginTop: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontWeight: "800" },
  btn: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, flex: 1, alignItems: "center" },
  btnText: { fontWeight: "900" },
  actions: { flexDirection: "row", gap: 10, marginBottom: 10 },
  actionBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  actionText: { fontWeight: "900" },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontWeight: "800" },
  count: { marginTop: 8, marginBottom: 8, fontSize: 12, fontWeight: "800" },
  logRow: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  ts: { fontSize: 12, fontWeight: "800" },
  level: { fontSize: 12, fontWeight: "900" },
  msg: { marginTop: 6, fontSize: 12, fontWeight: "800" },
  meta: { marginTop: 6, fontSize: 11, fontWeight: "700" },
});
