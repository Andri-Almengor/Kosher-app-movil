import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/theme/ThemeProvider";
import { AppFonts } from "@/theme/fonts";
import { useAuth } from "./authStore";
import { useI18n } from "@/i18n/I18nProvider";

export default function LoginScreen() {
  const nav = useNavigation<any>();
  const { palette: c } = useTheme();
  const { user, role, login, logout, isAdmin } = useAuth();
  const { t } = useI18n();

  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert(t("requiredFields"), t("loginRequiredFields"));
        return;
      }

      await login(email, password);

      // Si este modal es para admin, bloqueamos acceso a no-admin.
      if (!isAdmin()) {
        Alert.alert(t("accessDenied"), t("adminOnlyAccess"));
        await logout();
        return;
      }

      // Cierra el modal (el menú Admin aparecerá en el drawer)
      nav.goBack();
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        t("error"),
        err?.response?.data?.message ?? t("couldNotLogin")
      );
    }
  };

  // ─────────────── PERFIL (si abre desde otro lado) ───────────────
  if (user) {
    return (
      <View style={[s.container, { backgroundColor: c.bg }]}>
        <Text style={[s.title, { color: c.text }]}>{t("profile")}</Text>
        <Text style={[s.meta, { color: c.muted }]}>{t("name")}: {user.name}</Text>
        <Text style={[s.meta, { color: c.muted }]}>{t("email")}: {user.email}</Text>
        <Text style={[s.meta, { color: c.muted }]}>{t("role")}: {role}</Text>

        <Pressable
          style={[s.btn, { backgroundColor: c.danger, marginTop: 16 }]}
          onPress={logout}
        >
          <Text style={[s.btnText, { color: "#fff" }]}>{t("logout")}</Text>
        </Pressable>
      </View>
    );
  }

  // ───────────────────────── LOGIN ADMIN ─────────────────────────
  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 20 }}
      >
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}
          >
          <Text style={[s.title, { color: c.text }]}>{t("adminAccess")}</Text>
          <Text style={[s.sub, { color: c.muted }]}>{t("adminAccessHelp")}</Text>

          <TextInput
            style={[s.input, { borderColor: c.border, color: c.text }]}
            placeholder={t("email")}
            placeholderTextColor={c.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={[s.input, { borderColor: c.border, color: c.text }]}
            placeholder={t("password")}
            placeholderTextColor={c.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable style={[s.btn, { backgroundColor: c.primary, marginTop: 8 }]} onPress={handleLogin}>
            <Text style={[s.btnText, { color: c.primaryText }]}>{t("login")}</Text>
          </Pressable>

          <Pressable style={[s.ghostBtn, { borderColor: c.border }]} onPress={() => nav.goBack()}>
            <Text style={{ color: c.text, fontFamily: AppFonts.poppinsMediumItalic }}>{t("cancel")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16 },
  title: { fontSize: 22, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", letterSpacing: 0.2, marginBottom: 6 },
  sub: { fontSize: 13, fontFamily: AppFonts.poppinsRegular, marginBottom: 14 },
  meta: { marginBottom: 6, fontFamily: AppFonts.poppinsRegular },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    fontFamily: AppFonts.poppinsRegular,
  },
  btn: { paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  btnText: { fontFamily: AppFonts.poppinsMediumItalic },
  ghostBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
});
