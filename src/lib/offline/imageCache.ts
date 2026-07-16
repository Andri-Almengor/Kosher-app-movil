// src/lib/offline/imageCache.ts
// Descarga y cachea imágenes remotas para que se puedan ver offline.
// No usa dependencias nuevas (solo expo-file-system).

import * as FileSystem from "expo-file-system";

const DIR = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ""}imgcache/`;

function hashString(input: string) {
  // djb2 (simple, estable y sin deps)
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // unsigned
  return (hash >>> 0).toString(16);
}

function getExt(url: string) {
  try {
    const clean = url.split("?")[0].split("#")[0];
    const m = clean.match(/\.(png|jpg|jpeg|webp|gif)$/i);
    if (m?.[1]) return `.${m[1].toLowerCase()}`;
  } catch {}
  return ".img";
}

async function ensureDir() {
  if (!DIR) return;
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
    }
  } catch {}
}

export async function cacheImage(url?: string | null): Promise<string | null> {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    // Ya es local/file/base64/etc.
    return url;
  }

  await ensureDir();
  if (!DIR) return url;

  const filename = `${hashString(url)}${getExt(url)}`;
  const path = `${DIR}${filename}`;

  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists && info.uri) return info.uri;
  } catch {}

  try {
    const dl = await FileSystem.downloadAsync(url, path);
    return dl?.uri ?? path;
  } catch {
    // Si no se pudo descargar, devolvemos la URL original (online)
    return url;
  }
}

export async function cacheProductLikeImages<T extends Record<string, any>>(
  items: T[],
  fields: string[]
): Promise<T[]> {
  // Descarga en serie para no saturar; si quieres, lo paralelizamos con límite.
  const out: T[] = [];
  for (const item of items) {
    const copy: any = { ...item };
    for (const f of fields) {
      if (copy[f]) {
        copy[f] = await cacheImage(copy[f]);
      }
    }
    out.push(copy);
  }
  return out;
}
