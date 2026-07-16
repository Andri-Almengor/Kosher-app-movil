import { PixelRatio } from "react-native";

export function readableFont(size: number, min = 10, max = 22) {
  const fontScale = PixelRatio.getFontScale?.() ?? 1;
  const adjusted = fontScale > 1 ? size / Math.min(fontScale, 1.25) : size;
  return Math.max(min, Math.min(max, adjusted));
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function compactByWidth(width: number) {
  return width < 380;
}
