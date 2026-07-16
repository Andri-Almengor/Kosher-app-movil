import { getCollator, normalizeText } from '@/lib/text';

export type SealFilterOption = {
  value: string;
  imageUrl?: string | null;
};

const STORE_SEPARATORS = /\s*(?:,|\/|\||;| y | e | &|\n|\r\n)\s*/gi;

export function splitMultiValue(raw: unknown): string[] {
  const text = String(raw ?? '').trim();
  if (!text) return [];
  return text
    .split(STORE_SEPARATORS)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((v, idx, arr) => arr.findIndex((x) => normalizeText(x) === normalizeText(v)) === idx);
}

export function matchesMultiValue(raw: unknown, selected: unknown) {
  const want = normalizeText(selected);
  if (!want) return true;
  return splitMultiValue(raw).some((part) => normalizeText(part) === want);
}

export function uniqueMultiValueOptions(values: Array<unknown>, lang: string) {
  const map = new Map<string, string>();
  for (const raw of values) {
    for (const part of splitMultiValue(raw)) {
      const key = normalizeText(part);
      if (key && !map.has(key)) map.set(key, part);
    }
  }
  return Array.from(map.values()).sort((a, b) => getCollator(lang).compare(a, b));
}

export function buildSealFilterOptions<T extends { sello?: string | null; fotoSello1?: string | null; fotoSello2?: string | null }>(items: T[], lang: string): SealFilterOption[] {
  const map = new Map<string, SealFilterOption>();
  for (const item of items ?? []) {
    const label = String(item.sello ?? '').trim();
    const key = normalizeText(label);
    if (!key || key === '#value!') continue;
    const imageUrl = String(item.fotoSello1 ?? item.fotoSello2 ?? '').trim() || undefined;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { value: label, imageUrl });
      continue;
    }
    if (!prev.imageUrl && imageUrl) prev.imageUrl = imageUrl;
  }
  return Array.from(map.values()).sort((a, b) => getCollator(lang).compare(a.value, b.value));
}
