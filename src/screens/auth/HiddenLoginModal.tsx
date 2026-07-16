import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "@/theme/colors";
import { useAuth } from "@/auth/auth";

export function HiddenLoginModal() {
  const { signIn } = useAuth();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    const ok = await signIn(email.trim(), password);
    setLoading(false);
    if (ok) navigation.goBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Administrador</Text>
          <Text style={styles.subtitle}>Acceso oculto (mantén el logo 5s)</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            style={styles.input}
          />

          <Pressable style={[styles.btn, loading && { opacity: 0.7 }]} onPress={onSubmit} disabled={loading}>
            <Text style={styles.btnText}>{loading ? "Ingresando..." : "Iniciar sesión"}</Text>
          </Pressable>

          <Pressable style={styles.cancel} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 18 },
  card: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 18 },
  title: { fontSize: 18, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", letterSpacing: 0.2, color: COLORS.primary, textAlign: "center" },
  subtitle: { fontSize: 12, fontFamily: AppFonts.poppinsRegular, color: COLORS.textMuted, textAlign: "center", marginTop: 6, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: AppFonts.poppinsRegular,
    color: COLORS.text,
    marginBottom: 10,
  },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 6 },
  btnText: { color: COLORS.white, fontFamily: AppFonts.poppinsMediumItalic },
  cancel: { paddingVertical: 12, alignItems: "center" },
  cancelText: { color: COLORS.textMuted, fontFamily: AppFonts.poppinsMediumItalic },
});
