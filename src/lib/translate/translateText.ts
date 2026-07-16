import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV } from "@/config/env";
import { enqueueTranslate } from "./translationQueue";

/**
 * Simple runtime translation for dynamic backend content (novedades/anunciantes).
 * - Assumes source language is Spanish (es).
 * - Uses a configurable LibreTranslate-compatible endpoint.
 * - Caches results in memory + AsyncStorage.
 */

const MEM = new Map<string, string>();
const STORAGE_PREFIX = "kccr.translate.cache:";

function keyFor(text: string, targetLang: string) {
  // Keep key size reasonable
  const normalized = text.trim().slice(0, 1000);
  return `${STORAGE_PREFIX}${targetLang}:${hash(normalized)}`;
}

function hash(s: string) {
  // Lightweight non-crypto hash for cache keys
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

type TranslateResponse = {
  translatedText?: string;
  translated_text?: string;
};

export async function translateText(text: string, targetLang: "es" | "en") {
  const input = (text ?? "").trim();
  if (!input) return "";
  if (targetLang === "es") return input;

  const memKey = `${targetLang}:${input}`;
  const memHit = MEM.get(memKey);
  if (memHit) return memHit;

  const storageKey = keyFor(input, targetLang);
  const cached = await AsyncStorage.getItem(storageKey);
  if (cached) {
    MEM.set(memKey, cached);
    return cached;
  }

  // Default to a public LibreTranslate instance. You can override via app.json -> expo.extra.TRANSLATE_BASE_URL
  const base = (ENV.TRANSLATE_BASE_URL ?? "https://libretranslate.com").replace(/\/$/, "");
  const url = `${base}/translate`;

  try {
    return await enqueueTranslate(storageKey, async () => {
      const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ENV.TRANSLATE_API_KEY ? { "Authorization": `Bearer ${ENV.TRANSLATE_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        q: input,
        source: "es",
        target: targetLang,
        format: "text",
      }),
    });

    if (!res.ok) throw new Error(`translate failed: ${res.status}`);

    const data = (await res.json()) as TranslateResponse | TranslateResponse[];
    const translated = Array.isArray(data)
      ? (data[0]?.translatedText ?? data[0]?.translated_text)
      : (data.translatedText ?? (data as any).translated_text);

    const out = (translated ?? input).trim();
    MEM.set(memKey, out);
    await AsyncStorage.setItem(storageKey, out);
    return out;
    });
  } catch {
    // If translation fails, return original text.
    return input;
  }
}
