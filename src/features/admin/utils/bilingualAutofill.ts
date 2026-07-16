import { translateText } from "@/lib/translate/translateText";

function normalize(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const clean = String(value ?? "").trim();
    if (clean) return clean;
  }
  return "";
}

export async function resolveOptionTranslation(
  sourceEs: string,
  options: Array<{ nombreEs?: string | null; nombreEn?: string | null }> = []
) {
  const source = String(sourceEs ?? "").trim();
  if (!source) return "";

  const normalizedSource = normalize(source);
  const exactMatch = options.find((item) => normalize(item.nombreEs) === normalizedSource);
  const translatedValue = firstNonEmpty(exactMatch?.nombreEn, exactMatch?.nombreEs);
  if (translatedValue) return translatedValue;

  const reverseMatch = options.find((item) => normalize(item.nombreEn) === normalizedSource);
  const reverseValue = firstNonEmpty(reverseMatch?.nombreEn, reverseMatch?.nombreEs);
  if (reverseValue) return reverseValue;

  return translateText(source, "en");
}

export async function translateField(value: string) {
  const source = String(value ?? "").trim();
  if (!source) return "";
  return translateText(source, "en");
}
