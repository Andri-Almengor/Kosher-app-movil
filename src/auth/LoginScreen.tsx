import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/theme/ThemeProvider";
import { AppFonts } from "@/theme/fonts";
import { useAuth } from "@/app/auth/authStore";
import { useI18n } from "@/i18n/I18nProvider";

export default function LoginScreen() {
  const nav = useNavigation<any>();
  const { palette: c } = useTheme();
  const { user, login, logout, isAdmin } = useAuth();
  const { t } = useI18n();

  const [email, setEmail] = useState(user?.email ?? "Email");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert(t("requiredFields"), t("loginRequiredFields"));
        return;
      }

      setLoading(true);
      await login(email, password);

      if (!isAdmin()) {
        Alert.alert(t("accessDenied"), t("adminOnlyAccess"));
        await logout();
        return;
      }

      nav.goBack();
    } catch (err: any) {
      Alert.alert(t("error"), err?.response?.data?.message ?? t("couldNotLogin"));
    } finally {
      setLoading(false);
    }
  };

  if (user && isAdmin()) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.flex}>
        <View style={s.backdrop}>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}> 
            <Text style={[s.title, { color: c.text }]}>{t("profile")}</Text>
            <Text style={[s.meta, { color: c.muted }]}>{user.email}</Text>
            <Pressable style={[s.btn, { backgroundColor: c.primary }]} onPress={() => { logout(); nav.goBack(); }}>
              <Text style={[s.btnText, { color: c.primaryText }]}>{t("logout")}</Text>
            </Pressable>
            <Pressable style={[s.cancel, { borderColor: c.border }]} onPress={() => nav.goBack()}>
              <Text style={[s.cancelText, { color: c.text }]}>{t("close") || "Cerrar"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.flex}>
      <View style={s.backdrop}>
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}> 
          <Text style={[s.title, { color: c.text }]}>{t("adminAccess")}</Text>
          <Text style={[s.subtitle, { color: c.muted }]}>{t("adminAccessHelp")}</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t("email")}
            placeholderTextColor={c.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[s.input, { borderColor: c.border, color: c.text }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t("password")}
            placeholderTextColor={c.muted}
            secureTextEntry
            style={[s.input, { borderColor: c.border, color: c.text }]}
          />

          <Pressable style={[s.btn, { backgroundColor: c.primary }, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
            <Text style={[s.btnText, { color: c.primaryText }]}>{loading ? (t("loading") || "Entrando...") : t("login")}</Text>
          </Pressable>

          <Pressable style={[s.cancel, { borderColor: c.border }]} onPress={() => nav.goBack()}>
            <Text style={[s.cancelText, { color: c.text }]}>{t("cancel")}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 18 },
  card: { borderRadius: 18, padding: 18, borderWidth: 1 },
  title: { fontSize: 18, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", letterSpacing: 0.2, textAlign: "center" },
  subtitle: { fontSize: 12, fontFamily: AppFonts.poppinsRegular, textAlign: "center", marginTop: 6, marginBottom: 14 },
  meta: { fontSize: 12, fontFamily: AppFonts.poppinsRegular, textAlign: "center", marginTop: 6, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: AppFonts.poppinsRegular,
    marginBottom: 10,
  },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 6 },
  btnText: { fontFamily: AppFonts.poppinsMediumItalic },
  cancel: { paddingVertical: 12, alignItems: "center", borderWidth: 1, borderRadius: 12, marginTop: 10 },
  cancelText: { fontFamily: AppFonts.poppinsMediumItalic },
});
