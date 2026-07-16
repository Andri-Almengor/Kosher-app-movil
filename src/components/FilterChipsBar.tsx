import React, { useMemo, useRef } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/theme/ThemeProvider";
import { AppFonts } from "@/theme/fonts";
import { AppIcon } from "@/components/AppIcon";

type Chip = {
  key: string;
  label: string;
  onPress?: () => void;
  onRemove?: () => void;
};

type Props = {
  chips: Chip[];
  onPressFilters: () => void;
  onClearAll?: () => void;
};

export function FilterChipsBar({ chips, onPressFilters, onClearAll }: Props) {
  const { palette: c } = useTheme();
  const scroller = useRef<ScrollView>(null);

  const actions = useMemo(
    () => [
      { icon: "chevron-back" as const, onPress: () => scroller.current?.scrollTo({ x: 0, animated: true }) },
      { icon: "chevron-forward" as const, onPress: () => scroller.current?.scrollToEnd?.({ animated: true }) },
    ],
    []
  );

  return (
    <View style={[styles.wrap, { borderColor: c.border }]}> 
      <Pressable onPress={onPressFilters} style={[styles.iconBtn, { borderColor: c.border }]} accessibilityRole="button">
        <AppIcon name="filtros" size={18} />
      </Pressable>

      <Pressable onPress={actions[0].onPress} style={[styles.navBtn, { borderColor: c.border }]}> 
        <Ionicons name="chevron-back" size={18} color={c.text} />
      </Pressable>

      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {chips.length === 0 ? (
          <Text style={[styles.hint, { color: c.muted }]}>Sin filtros activos</Text>
        ) : (
          chips.map((chip) => (
            <Pressable
              key={chip.key}
              onPress={chip.onPress}
              style={[styles.chip, { backgroundColor: c.bg, borderColor: c.border }]}
            >
              <Text style={[styles.chipText, { color: c.text }]} numberOfLines={1}>
                {chip.label}
              </Text>
              {chip.onRemove ? (
                <Pressable onPress={chip.onRemove} hitSlop={8} style={{ marginLeft: 6 }}>
                  <Ionicons name="close" size={14} color={c.muted} />
                </Pressable>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>

      <Pressable onPress={actions[1].onPress} style={[styles.navBtn, { borderColor: c.border }]}> 
        <Ionicons name="chevron-forward" size={18} color={c.text} />
      </Pressable>

      {onClearAll ? (
        <Pressable onPress={onClearAll} style={[styles.clearBtn, { borderColor: c.border }]}> 
          <Text style={[styles.clearText, { color: c.text }]}>Limpiar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtn: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: { fontSize: 13, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { alignItems: "center", gap: 8, paddingHorizontal: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 220,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: AppFonts.poppinsSemiBold, fontWeight: "800" },
  hint: { fontSize: 12, fontWeight: "700" },
});
