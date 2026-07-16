// src/lib/offline/largeStorage.ts
// Utilidad para guardar / leer JSON grandes en AsyncStorage.
// AsyncStorage suele tener límites por item (varía por plataforma),
// así que dividimos el string en chunks.

import AsyncStorage from "@react-native-async-storage/async-storage";

const CHUNK_SIZE = 500_000; // 500 KB aprox (en caracteres)

type LargeMeta = {
  chunks: number;
  savedAt: string;
};

function metaKey(key: string) {
  return `${key}::__meta__`;
}

function chunkKey(key: string, idx: number) {
  return `${key}::__chunk__:${idx}`;
}

export async function setLargeJSON<T>(key: string, value: T) {
  const json = JSON.stringify(value);
  const chunks = Math.ceil(json.length / CHUNK_SIZE) || 1;

  const pairs: [string, string][] = [];
  for (let i = 0; i < chunks; i++) {
    const part = json.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    pairs.push([chunkKey(key, i), part]);
  }

  const meta: LargeMeta = { chunks, savedAt: new Date().toISOString() };
  pairs.push([metaKey(key), JSON.stringify(meta)]);

  // Limpia leftovers si antes tenía más chunks
  const oldMetaRaw = await AsyncStorage.getItem(metaKey(key));
  const toRemove: string[] = [];
  if (oldMetaRaw) {
    try {
      const old = JSON.parse(oldMetaRaw) as LargeMeta;
      for (let i = chunks; i < (old?.chunks ?? 0); i++) {
        toRemove.push(chunkKey(key, i));
      }
    } catch {}
  }

  await AsyncStorage.multiSet(pairs);
  if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
}

export async function getLargeJSON<T>(
  key: string
): Promise<{ value: T; savedAt: string } | null> {
  const metaRaw = await AsyncStorage.getItem(metaKey(key));
  if (!metaRaw) return null;

  let meta: LargeMeta | null = null;
  try {
    meta = JSON.parse(metaRaw) as LargeMeta;
  } catch {
    return null;
  }
  if (!meta?.chunks) return null;

  const keys = Array.from({ length: meta.chunks }, (_, i) => chunkKey(key, i));
  const entries = await AsyncStorage.multiGet(keys);

  const json = entries.map(([, v]) => v ?? "").join("");
  if (!json) return null;

  try {
    const value = JSON.parse(json) as T;
    return { value, savedAt: meta.savedAt };
  } catch {
    return null;
  }
}

export async function removeLargeJSON(key: string) {
  const metaRaw = await AsyncStorage.getItem(metaKey(key));
  if (!metaRaw) return;

  try {
    const meta = JSON.parse(metaRaw) as LargeMeta;
    const keys = [metaKey(key)].concat(
      Array.from({ length: meta.chunks ?? 0 }, (_, i) => chunkKey(key, i))
    );
    await AsyncStorage.multiRemove(keys);
  } catch {
    // fallback best effort
    await AsyncStorage.removeItem(metaKey(key));
  }
}
