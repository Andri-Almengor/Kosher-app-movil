import type { Lang } from "@/i18n/I18nProvider";

const collatorCache = new Map<string, Intl.Collator>();

export function getCollator(lang: Lang | string = "es") {
  const key = String(lang || "es");
  let collator = collatorCache.get(key);
  if (!collator) {
    collator = new Intl.Collator(key, {
      sensitivity: "base",
      usage: "sort",
      numeric: true,
      ignorePunctuation: true,
    });
    collatorCache.set(key, collator);
  }
  return collator;
}

export function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function includesNormalized(haystack: unknown, needle: unknown) {
  return normalizeText(haystack).includes(normalizeText(needle));
}
