import React from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import ImagePickerUpload from "@/components/ImagePickerUpload";
import { AppFonts } from "@/theme/fonts";

export function SafeFormScreen({ children, footer, backgroundColor, contentStyle }: { children: React.ReactNode; footer?: React.ReactNode; backgroundColor: string; contentStyle?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={["top"]} style={[styles.safe, { backgroundColor }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }, contentStyle]}>
          {children}
        </ScrollView>
        {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function FormSection({ title, description, children, style }: { title: string; description?: string; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function FormInput({ label, hint, style, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor="#94a3b8" style={[styles.input, style]} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function FormSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pillWrap}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable key={option} onPress={() => onChange(option)} style={[styles.pill, active && styles.pillActive]}>
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function FormSwitch({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.switchRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.switchTrack, value && styles.switchTrackOn]}>
        <View style={[styles.switchKnob, value && styles.switchKnobOn]} />
      </View>
    </Pressable>
  );
}

export function FormImagePicker(props: React.ComponentProps<typeof ImagePickerUpload>) {
  return <ImagePickerUpload {...props} />;
}

export function FormActions({ children }: { children: React.ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

export function LoadingButton({ title, loading, disabled, icon, onPress, variant = "primary" }: { title: string; loading?: boolean; disabled?: boolean; icon?: React.ComponentProps<typeof Ionicons>["name"]; onPress: () => void; variant?: "primary" | "secondary" | "danger" }) {
  const isDisabled = disabled || loading;
  const variantStyle = variant === "primary" ? styles.primaryButton : variant === "danger" ? styles.dangerButton : styles.secondaryButton;
  return (
    <Pressable onPress={onPress} disabled={isDisabled} style={[styles.button, variantStyle, isDisabled && styles.buttonDisabled]}>
      {loading ? <ActivityIndicator size="small" color={variant === "primary" ? "#fff" : "#0f172a"} /> : icon ? <Ionicons name={icon} size={18} color={variant === "primary" ? "#fff" : "#0f172a"} /> : null}
      <Text style={[styles.buttonText, variant === "primary" && styles.primaryButtonText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, flex: { flex: 1 }, scroll: { padding: 16 }, footer: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: "#fff", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb" },
  section: { backgroundColor: "#fff", borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 14 },
  sectionTitle: { fontFamily: AppFonts.poppinsSemiBold, fontSize: 16, fontWeight: "800", color: "#0f172a" },
  sectionDescription: { marginTop: 4, fontFamily: AppFonts.poppinsRegular, fontSize: 12, lineHeight: 18, color: "#64748b" },
  sectionBody: { marginTop: 12, gap: 12 }, fieldWrap: { gap: 7 }, label: { fontFamily: AppFonts.poppinsSemiBold, fontSize: 12, fontWeight: "800", color: "#0f172a" },
  hint: { fontFamily: AppFonts.poppinsRegular, fontSize: 11, color: "#64748b" }, input: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 14, color: "#0f172a", backgroundColor: "#f8fafc", fontFamily: AppFonts.poppinsRegular },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, pill: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff" }, pillActive: { backgroundColor: "#3662a7", borderColor: "#3662a7" }, pillText: { fontSize: 12, color: "#0f172a", fontWeight: "800" }, pillTextActive: { color: "#fff" },
  switchRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, switchTrack: { width: 48, height: 28, borderRadius: 999, padding: 3, backgroundColor: "#cbd5e1" }, switchTrackOn: { backgroundColor: "#3662a7" }, switchKnob: { width: 22, height: 22, borderRadius: 999, backgroundColor: "#fff" }, switchKnobOn: { transform: [{ translateX: 20 }] },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 10 }, button: { minHeight: 48, borderRadius: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1 }, primaryButton: { backgroundColor: "#3662a7", borderColor: "#3662a7" }, secondaryButton: { backgroundColor: "#fff", borderColor: "#e2e8f0" }, dangerButton: { backgroundColor: "#fee2e2", borderColor: "#fecaca" }, buttonDisabled: { opacity: 0.6 }, buttonText: { fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800", color: "#0f172a" }, primaryButtonText: { color: "#fff" },
});
