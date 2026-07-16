import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = { steps: string[]; current: number; onChange?: (index: number) => void; primary: string; muted: string; border: string; surface: string; text: string };

export default function StepProgress({ steps, current, onChange, primary, muted, border, surface, text }: Props) {
  return (
    <View style={styles.wrap}>
      {steps.map((label, index) => {
        const active = index === current;
        const done = index < current;
        return (
          <Pressable key={label} disabled={!onChange} onPress={() => onChange?.(index)} style={[styles.step, { borderColor, backgroundColor: active ? `${primary}18` : surface }]}>
            <View style={[styles.dot, { backgroundColor: active || done ? primary : border }]}><Text style={styles.dotText}>{index + 1}</Text></View>
            <Text numberOfLines={1} style={[styles.label, { color: active ? text : muted }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  step: { borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 22, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  dotText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  label: { maxWidth: 110, fontSize: 12, fontWeight: "900" },
});
