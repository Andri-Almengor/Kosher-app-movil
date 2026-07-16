import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INDEX_KEY = "offline:filecache:index:v1";
const CACHE_FOLDER = "offline-files";
const MAX_ITEMS = 400;
const MAX_AGE_DAYS = 90;

type IndexEntry = { uri: string; localUri: string; ts: number };

let memoryIndex: Record<string, IndexEntry> | null = null;

function now() {
  return Date.now();
}

function dayMs(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

async function loadIndex(): Promise<Record<string, IndexEntry>> {
  if (memoryIndex) return memoryIndex;
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    memoryIndex = raw ? JSON.parse(raw) : {};
  } catch {
    memoryIndex = {};
  }
  return memoryIndex;
}

async function saveIndex(idx: Record<string, IndexEntry>) {
  memoryIndex = idx;
  try {
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(idx));
  } catch {}
}

function safeFileName(remoteUri: string) {
  try {
    return encodeURIComponent(remoteUri).replace(/%/g, "_").slice(0, 180);
  } catch {
    return String(Date.now());
  }
}

function guessExt(remoteUri: string) {
  try {
    const clean = remoteUri.split("?")[0].split("#")[0];
    const match = clean.match(/\.[a-z0-9]{2,8}$/i);
    return match?.[0] ?? ".bin";
  } catch {
    return ".bin";
  }
}

function getCacheDir() {
  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? null;
  return baseDir ? `${baseDir}${CACHE_FOLDER}/` : null;
}

export async function ensureFileCacheDir() {
  if (Platform.OS === "web") return null;
  const dir = getCacheDir();
  if (!dir) return null;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {}
  return dir;
}

export async function getCachedRemoteFileUri(remoteUri?: string | null): Promise<string | null> {
  if (!remoteUri) return null;
  if (Platform.OS === "web") return remoteUri;

  const idx = await loadIndex();
  const entry = idx[remoteUri];
  if (!entry) return null;

  if (now() - entry.ts > dayMs(MAX_AGE_DAYS)) {
    try { await FileSystem.deleteAsync(entry.localUri, { idempotent: true }); } catch {}
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

  entry.ts = now();
  idx[remoteUri] = entry;
  await saveIndex(idx);
  return entry.localUri;
}

async function pruneIndex(idx: Record<string, IndexEntry>) {
  const cutoff = now() - dayMs(MAX_AGE_DAYS);
  for (const [key, entry] of Object.entries(idx)) {
    if (entry.ts < cutoff) {
      try { await FileSystem.deleteAsync(entry.localUri, { idempotent: true }); } catch {}
      delete idx[key];
    }
  }

  const entries = Object.entries(idx).sort((a, b) => a[1].ts - b[1].ts);
  if (entries.length <= MAX_ITEMS) return;
  for (const [key, entry] of entries.slice(0, entries.length - MAX_ITEMS)) {
    try { await FileSystem.deleteAsync(entry.localUri, { idempotent: true }); } catch {}
    delete idx[key];
  }
}

export async function cacheRemoteFile(remoteUri?: string | null): Promise<string | null> {
  if (!remoteUri) return null;
  if (Platform.OS === "web") return remoteUri;

  const cached = await getCachedRemoteFileUri(remoteUri);
  if (cached) return cached;

  const dir = await ensureFileCacheDir();
  if (!dir) return null;

  const idx = await loadIndex();
  const target = `${dir}${safeFileName(remoteUri)}${guessExt(remoteUri)}`;

  try {
    const result = await FileSystem.downloadAsync(remoteUri, target);
    idx[remoteUri] = { uri: remoteUri, localUri: result.uri, ts: now() };
    await pruneIndex(idx);
    await saveIndex(idx);
    return result.uri;
  } catch {
    return null;
  }
}

export async function cacheManyFiles(
  remoteUris: string[],
  concurrency = 3,
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
      const before = await getCachedRemoteFileUri(current);
      const cached = await cacheRemoteFile(current);
      if (!before && cached) downloaded += 1;
      if (onProgress) await onProgress({ downloaded, total: unique.length });
    }
  }

  const totalWorkers = Math.max(1, Math.min(concurrency, 4, unique.length || 1));
  await Promise.all(Array.from({ length: totalWorkers }, () => worker()));
  return { total: unique.length, downloaded, cancelled };
}

export async function getFileCacheStats(totalKnown = 0) {
  const idx = await loadIndex();
  const entries = [];
  for (const entry of Object.values(idx)) {
    try {
      const info = await FileSystem.getInfoAsync(entry.localUri);
      if (info.exists) entries.push(entry);
    } catch {}
  }
  return { count: entries.length, indexed: Object.keys(idx).length, totalKnown, directory: getCacheDir() };
}

export async function purgeFileCache() {
  if (Platform.OS === "web") return { ok: true, skipped: true as const };
  const dir = getCacheDir();
  try {
    if (dir) await FileSystem.deleteAsync(dir, { idempotent: true });
  } catch {}
  memoryIndex = {};
  try { await AsyncStorage.removeItem(INDEX_KEY); } catch {}
  return { ok: true, skipped: false as const };
}
