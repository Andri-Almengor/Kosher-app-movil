import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INDEX_KEY = "imgcache:index:v1";
const CACHE_FOLDER = "offline-images";
const CACHE_FOLDER_PUBLIC = "KosherCR/offline-images";
const MAX_ITEMS = 1200;
const MAX_AGE_DAYS = 90;
const MAX_TOTAL_BYTES = 250 * 1024 * 1024;

type IndexEntry = { uri: string; localUri: string; ts: number; size?: number | null };

let memoryIndex: Record<string, IndexEntry> | null = null;

function now() {
  return Date.now();
}

function dayMs(d: number) {
  return d * 24 * 60 * 60 * 1000;
}

async function loadIndex(): Promise<Record<string, IndexEntry>> {
  if (memoryIndex) return memoryIndex;
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    memoryIndex = raw ? JSON.parse(raw) : {};
    return memoryIndex;
  } catch {
    memoryIndex = {};
    return memoryIndex;
  }
}

async function saveIndex(idx: Record<string, IndexEntry>) {
  memoryIndex = idx;
  try {
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(idx));
  } catch {}
}

function safeFileName(remoteUri: string) {
  try {
    const encoded = encodeURIComponent(remoteUri).replace(/%/g, "_");
    return encoded.slice(0, 180);
  } catch {
    return String(Date.now());
  }
}

function guessExt(remoteUri: string) {
  try {
    const clean = remoteUri.split("?")[0].split("#")[0];
    const match = clean.match(/\.(png|jpg|jpeg|webp|gif|heic|bmp|svg)$/i);
    return match?.[0] ?? ".img";
  } catch {
    return ".img";
  }
}

export async function getCachedImageUri(remoteUri?: string | null): Promise<string | null> {
  if (!remoteUri) return null;
  if (Platform.OS === "web") return remoteUri;

  const idx = await loadIndex();
  const entry = idx[remoteUri];
  if (!entry) return null;

  // Expira por edad
  if (now() - entry.ts > dayMs(MAX_AGE_DAYS)) {
    try {
      await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
    } catch {}
    delete idx[remoteUri];
    await saveIndex(idx);
    return null;
  }

  const info = await FileSystem.getInfoAsync(entry.localUri);
  if (!info.exists) {
    delete idx[remoteUri];
    await saveIndex(idx);
    return null;
  }

  // touch
  entry.ts = now();
  idx[remoteUri] = entry;
  await saveIndex(idx);

  return entry.localUri;
}

export function getImageCacheDirectory() {
  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? null;
  return baseDir ? baseDir + CACHE_FOLDER + "/" : null;
}

export function getExpectedAndroidVisiblePaths() {
  return {
    apk: `/Android/data/<tu.paquete>/files/${CACHE_FOLDER}/`,
    expoGo: `/Android/data/host.exp.exponent/files/ExperienceData/<experience-id>/${CACHE_FOLDER}/`,
    publicHint: `/storage/emulated/0/${CACHE_FOLDER_PUBLIC}/`,
  };
}

export async function ensureImageCacheDir() {
  const dir = getImageCacheDirectory();
  if (!dir || Platform.OS === "web") return null;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {}
  return dir;
}

export async function cacheImage(remoteUri?: string | null): Promise<string | null> {
  if (!remoteUri) return null;
  if (Platform.OS === "web") return remoteUri;

  const cached = await getCachedImageUri(remoteUri);
  if (cached) return cached;

  const dir = await ensureImageCacheDir();
  if (!dir || Platform.OS === "web") return null;

  const idx = await loadIndex();
  const filename = safeFileName(remoteUri) + guessExt(remoteUri);
  const localUri = dir + filename;

  try {
    const dl = await FileSystem.downloadAsync(remoteUri, localUri);
    const info = await FileSystem.getInfoAsync(dl.uri);
    idx[remoteUri] = { uri: remoteUri, localUri: dl.uri, ts: now(), size: (info as any)?.size ?? null };
    await pruneIndex(idx);
    await saveIndex(idx);
    return dl.uri;
  } catch {
    return null;
  }
}

async function pruneIndex(idx: Record<string, IndexEntry>) {
  const cutoff = now() - dayMs(MAX_AGE_DAYS);
  for (const [k, v] of Object.entries(idx)) {
    if (v.ts < cutoff) {
      try {
        await FileSystem.deleteAsync(v.localUri, { idempotent: true });
      } catch {}
      delete idx[k];
    }
  }

  let entries = Object.entries(idx);
  if (entries.length > MAX_ITEMS) {
    entries.sort((a, b) => a[1].ts - b[1].ts);
    const toDelete = entries.slice(0, entries.length - MAX_ITEMS);
    for (const [k, v] of toDelete) {
      try {
        await FileSystem.deleteAsync(v.localUri, { idempotent: true });
      } catch {}
      delete idx[k];
    }
    entries = Object.entries(idx);
  }

  const totalBytes = entries.reduce((acc, [, v]) => acc + (v.size ?? 0), 0);
  if (totalBytes <= MAX_TOTAL_BYTES) return;

  entries.sort((a, b) => a[1].ts - b[1].ts);
  let running = totalBytes;
  for (const [k, v] of entries) {
    if (running <= MAX_TOTAL_BYTES) break;
    try {
      await FileSystem.deleteAsync(v.localUri, { idempotent: true });
    } catch {}
    running -= v.size ?? 0;
    delete idx[k];
  }
}


export async function cacheManyImages(
  remoteUris: string[],
  concurrency = 4,
  onProgress?: (state: { downloaded: number; total: number }) => void | Promise<void>,
  shouldStop?: () => boolean | Promise<boolean>
) {
  const unique = Array.from(new Set((remoteUris ?? []).filter((u): u is string => !!u && /^https?:\/\//i.test(u))));
  let cursor = 0;
  let downloaded = 0;
  let cancelled = false;

  async function worker() {
    while (cursor < unique.length) {
      if (shouldStop && (await shouldStop())) {
        cancelled = true;
        return;
      }
      const current = unique[cursor++];
      const before = await getCachedImageUri(current);
      const cached = await cacheImage(current);
      if (!before && cached) downloaded += 1;
      if (onProgress) await onProgress({ downloaded, total: unique.length });
    }
  }

  const totalWorkers = Math.max(1, Math.min(concurrency, 6, unique.length || 1));
  await Promise.all(Array.from({ length: totalWorkers }, () => worker()));
  return { total: unique.length, downloaded, cancelled };
}

export async function getImageCacheStats(totalKnown = 0) {
  const idx = await loadIndex();
  const dir = getImageCacheDirectory();
  const visible = getExpectedAndroidVisiblePaths();
  const existingEntries = [];
  for (const entry of Object.values(idx)) {
    try {
      const info = await FileSystem.getInfoAsync(entry.localUri);
      if (info.exists) existingEntries.push(entry);
    } catch {}
  }
  return { count: existingEntries.length, indexed: Object.keys(idx).length, totalKnown, folder: CACHE_FOLDER, directory: dir, visible };
}


export async function purgeImageCache() {
  if (Platform.OS === 'web') return { ok: true, skipped: true as const };
  const dir = getImageCacheDirectory();
  try {
    if (dir) await FileSystem.deleteAsync(dir, { idempotent: true });
  } catch {}
  memoryIndex = {};
  try {
    await AsyncStorage.removeItem(INDEX_KEY);
  } catch {}
  return { ok: true, skipped: false as const };
}
