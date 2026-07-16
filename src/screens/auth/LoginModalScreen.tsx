import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/app/auth/authStore";
import { useTheme } from "@/theme/ThemeProvider";
import { AppFonts } from "@/theme/fonts";

export function LoginModalScreen() {
  const nav = useNavigation<any>();
  const { palette: c } = useTheme();

  const login = useAuth((s) => s.login);
  const logout = useAuth((s) => s.logout);
  const isAdmin = useAuth((s) => s.isAdmin());
  const user = useAuth((s) => s.user);

  const [email, setEmail] = useState("admin@kccr.com");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (!email || !password) {
      Alert.alert("Campos requeridos", "Ingresa correo y contraseña.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      nav.goBack();
    } catch (e: any) {
      Alert.alert("No se pudo iniciar sesión", e?.response?.data?.message ?? e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin && user) {
    return (
      <View style={[s.root, { backgroundColor: c.bg }]}>
        <Text style={[s.title, { color: c.text }]}>Sesión activa</Text>
        <Text style={[s.meta, { color: c.muted }]}>{user.email}</Text>

        <Pressable style={[s.btn, { backgroundColor: c.primary }]} onPress={() => { logout(); nav.goBack(); }}>
          <Text style={[s.btnText, { color: c.primaryText }]}>Cerrar sesión</Text>
        </Pressable>

        <Pressable style={[s.btn, { backgroundColor: "transparent", borderWidth: 1, borderColor: c.border }]} onPress={() => nav.goBack()}>
          <Text style={[s.btnText, { color: c.text }]}>Cerrar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: c.bg }]}>
      <Text style={[s.title, { color: c.text }]}>Acceso administrador</Text>
      <Text style={[s.subtitle, { color: c.muted }]}>
        (Pantalla oculta) Mantén presionado el logo por 5 segundos.
      </Text>

      <TextInput
        style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
        placeholder="Correo"
        placeholderTextColor={c.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
        placeholder="Contraseña"
        placeholderTextColor={c.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable disabled={loading} style={[s.btn, { backgroundColor: c.primary, opacity: loading ? 0.7 : 1 }]} onPress={doLogin}>
        <Text style={[s.btnText, { color: c.primaryText }]}>{loading ? "Entrando..." : "Iniciar sesión"}</Text>
      </Pressable>

      <Pressable style={[s.btn, { backgroundColor: "transparent", borderWidth: 1, borderColor: c.border }]} onPress={() => nav.goBack()}>
        <Text style={[s.btnText, { color: c.text }]}>Cerrar</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, padding: 18, justifyContent: "center", gap: 10 },
  title: { fontSize: 20, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", letterSpacing: 0.2 },
  subtitle: { fontSize: 13, fontFamily: AppFonts.poppinsRegular, marginBottom: 10 },
  meta: { fontSize: 13, fontFamily: AppFonts.poppinsRegular, marginBottom: 10 },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontFamily: AppFonts.poppinsRegular,
  },
  btn: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontFamily: AppFonts.poppinsMediumItalic },
});
