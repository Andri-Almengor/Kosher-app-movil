import React from "react";
import { View, TextInput, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { AppFonts } from "@/theme/fonts";
import { AppIcon } from "@/components/AppIcon";

export const SearchBar = React.memo(function SearchBar({
  value,
  onChangeText,
  onPressFilter,
  placeholder = "Buscar",
  variant = "default",
  activeFiltersCount,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (s: string) => void;
  onPressFilter?: () => void;
  placeholder?: string;
  variant?: "default" | "onPrimary";
  activeFiltersCount?: number;
  onSubmitEditing?: () => void;
}) {
  const { palette: c } = useTheme();
  const isOnPrimary = variant === "onPrimary";

  const inputBg = isOnPrimary ? "rgba(255,255,255,0.92)" : c.card;
  const iconColor = isOnPrimary ? "#1f6ad3" : c.muted;
  const textColor = isOnPrimary ? "#0b0b0b" : c.text;
  const borderColor = isOnPrimary ? "hsla(189, 86%, 43%, 0.08)" : c.border;
  const count = Math.max(0, activeFiltersCount ?? 0);
  const showBadge = count > 0;
  const showFilter = typeof onPressFilter === "function";

  return (
    <View style={styles.wrap}>
      <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor }]}> 
        <AppIcon name="busqueda" size={20} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={iconColor}
          style={[styles.input, { color: textColor }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          onSubmitEditing={onSubmitEditing}
        />
        {value ? (
          <Pressable onPress={() => onChangeText("")} hitSlop={10} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={iconColor} />
          </Pressable>
        ) : null}
      </View>

      {showFilter ? (
        <Pressable
          style={[
            styles.filterBtn,
            {
              backgroundColor: inputBg,
              borderColor,
              borderWidth: showBadge ? 2 : 1,
            },
          ]}
          onPress={onPressFilter}
          hitSlop={10}
        >
          <AppIcon name="filtros" size={20} opacity={showBadge ? 1 : 0.9} />
          {showBadge ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isOnPrimary ? "#1f4d8f" : c.primary,
                  borderColor: inputBg,
                },
              ]}
            >
              <Ionicons name="checkmark" size={12} color={isOnPrimary ? "#fff" : c.primaryText} />
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 44,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 14, fontFamily: AppFonts.montserratRegular, paddingVertical: 10 },
  clearBtn: { paddingVertical: 4 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  badge: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 16,
    height: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
});

export default SearchBar;
