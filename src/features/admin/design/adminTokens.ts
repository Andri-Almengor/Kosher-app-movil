export const adminTokens = {
  color: {
    primary: "#3662a7",
    primaryDark: "#244b86",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
    border: "#e2e8f0",
    danger: "#dc2626",
    success: "#16a34a",
    warning: "#f59e0b",
    info: "#0284c7",
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 999,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  shadow: {
    card: {
      shadowColor: "#0f172a",
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
  },
} as const;

export type AdminTone = "blue" | "green" | "amber" | "purple" | "red" | "slate";

export const adminToneMap: Record<AdminTone, { bg: string; fg: string; border: string }> = {
  blue: { bg: "#dbeafe", fg: "#1d4ed8", border: "#bfdbfe" },
  green: { bg: "#dcfce7", fg: "#15803d", border: "#bbf7d0" },
  amber: { bg: "#fef3c7", fg: "#b45309", border: "#fde68a" },
  purple: { bg: "#f3e8ff", fg: "#7e22ce", border: "#e9d5ff" },
  red: { bg: "#fee2e2", fg: "#b91c1c", border: "#fecaca" },
  slate: { bg: "#f1f5f9", fg: "#334155", border: "#e2e8f0" },
};
