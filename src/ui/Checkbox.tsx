import { Pressable, View, Text, StyleSheet } from "react-native";

type Props = { checked: boolean; onChange?: (val: boolean) => void; label?: string };

export default function Checkbox({ checked, onChange, label }: Props) {
  return (
    <Pressable
      onPress={() => onChange?.(!checked)}
      style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      hitSlop={8}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      {label ? <Text>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: "#D1D5DB",
    alignItems: "center", justifyContent: "center", backgroundColor: "#fff",
  },
  boxChecked: { backgroundColor: "#111", borderColor: "#111" },
  tick: { color: "#fff", fontWeight: "800" },
});
