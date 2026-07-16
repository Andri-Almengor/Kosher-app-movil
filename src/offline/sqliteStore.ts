import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

export type ResourceKey = 'productos' | 'noticias' | 'eventos' | 'restaurantes' | 'manifest';

type ResourceRow = {
  resource_key: string;
  payload: string;
  etag: string | null;
  last_updated_at: string | null;
  saved_at: string;
  item_count: number;
};

const DB_NAME = 'kccr-offline.db';
const FALLBACK_PREFIX = 'sqlite-fallback:';
let dbPromise: Promise<SQLite.SQLiteDatabase | null> | null = null;

async function getDb() {
  if (Platform.OS === 'web') return null;
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.execAsync(`
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS resource_snapshots (
            resource_key TEXT PRIMARY KEY NOT NULL,
            payload TEXT NOT NULL,
            etag TEXT,
            last_updated_at TEXT,
            saved_at TEXT NOT NULL,
            item_count INTEGER NOT NULL DEFAULT 0
          );
          CREATE TABLE IF NOT EXISTS kv_store (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT
          );
          CREATE TABLE IF NOT EXISTS i18n_cache (
            lang TEXT PRIMARY KEY NOT NULL,
            payload TEXT NOT NULL,
            etag TEXT,
            saved_at TEXT NOT NULL
          );
        `);
        return db;
      } catch {
        return null;
      }
    })();
  }
  return dbPromise;
}

function fbKey(key: string) {
  return `${FALLBACK_PREFIX}${key}`;
}

export async function initOfflineDb() {
  await getDb();
}

export async function setKv(key: string, value: string | null) {
  const db = await getDb();
  if (!db) {
    if (value == null) await AsyncStorage.removeItem(fbKey(`kv:${key}`));
    else await AsyncStorage.setItem(fbKey(`kv:${key}`), value);
    return;
  }
  await db.runAsync(`INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)`, [key, value]);
}

export async function getKv(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return AsyncStorage.getItem(fbKey(`kv:${key}`));
  const row = await db.getFirstAsync<{ value: string | null }>(`SELECT value FROM kv_store WHERE key = ?`, [key]);
  return row?.value ?? null;
}

export async function saveResourceSnapshot<T = any>(
  resource: ResourceKey,
  items: T[],
  meta?: { etag?: string | null; lastUpdatedAt?: string | null }
) {
  const payload = JSON.stringify(items ?? []);
  const savedAt = new Date().toISOString();
  const itemCount = Array.isArray(items) ? items.length : 0;
  const db = await getDb();
  if (!db) {
    await AsyncStorage.setItem(
      fbKey(`resource:${resource}`),
      JSON.stringify({ payload: items ?? [], etag: meta?.etag ?? null, lastUpdatedAt: meta?.lastUpdatedAt ?? null, savedAt, itemCount })
    );
    return;
  }
  await db.runAsync(
    `INSERT OR REPLACE INTO resource_snapshots (resource_key, payload, etag, last_updated_at, saved_at, item_count)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [resource, payload, meta?.etag ?? null, meta?.lastUpdatedAt ?? null, savedAt, itemCount]
  );
}

export async function getResourceSnapshot<T = any>(resource: ResourceKey): Promise<{
  value: T[];
  etag: string | null;
  lastUpdatedAt: string | null;
  savedAt: string | null;
  itemCount: number;
} | null> {
  const db = await getDb();
  if (!db) {
    const raw = await AsyncStorage.getItem(fbKey(`resource:${resource}`));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return {
        value: Array.isArray(parsed?.payload) ? parsed.payload : [],
        etag: parsed?.etag ?? null,
        lastUpdatedAt: parsed?.lastUpdatedAt ?? null,
        savedAt: parsed?.savedAt ?? null,
        itemCount: Number(parsed?.itemCount ?? 0),
      };
    } catch {
      return null;
    }
  }
  const row = await db.getFirstAsync<ResourceRow>(
    `SELECT resource_key, payload, etag, last_updated_at, saved_at, item_count
     FROM resource_snapshots WHERE resource_key = ?`,
    [resource]
  );
  if (!row) return null;
  try {
    return {
      value: JSON.parse(row.payload) ?? [],
      etag: row.etag ?? null,
      lastUpdatedAt: row.last_updated_at ?? null,
      savedAt: row.saved_at ?? null,
      itemCount: Number(row.item_count ?? 0),
    };
  } catch {
    return { value: [], etag: row.etag ?? null, lastUpdatedAt: row.last_updated_at ?? null, savedAt: row.saved_at ?? null, itemCount: 0 };
  }
}

export async function getResourceItems<T = any>(resource: ResourceKey): Promise<T[]> {
  return (await getResourceSnapshot<T>(resource))?.value ?? [];
}

export async function saveI18nDict(lang: 'es' | 'en', dict: Record<string, string>, etag?: string | null) {
  const payload = JSON.stringify(dict ?? {});
  const savedAt = new Date().toISOString();
  const db = await getDb();
  if (!db) {
    await AsyncStorage.setItem(fbKey(`i18n:${lang}`), JSON.stringify({ payload: dict ?? {}, etag: etag ?? null, savedAt }));
    return;
  }
  await db.runAsync(`INSERT OR REPLACE INTO i18n_cache (lang, payload, etag, saved_at) VALUES (?, ?, ?, ?)`, [lang, payload, etag ?? null, savedAt]);
}

export async function getI18nDict(lang: 'es' | 'en'): Promise<{ dict: Record<string, string>; etag: string | null } | null> {
  const db = await getDb();
  if (!db) {
    const raw = await AsyncStorage.getItem(fbKey(`i18n:${lang}`));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return { dict: parsed?.payload ?? {}, etag: parsed?.etag ?? null };
    } catch {
      return null;
    }
  }
  const row = await db.getFirstAsync<{ payload: string; etag: string | null }>(`SELECT payload, etag FROM i18n_cache WHERE lang = ?`, [lang]);
  if (!row) return null;
  try {
    return { dict: JSON.parse(row.payload) ?? {}, etag: row.etag ?? null };
  } catch {
    return { dict: {}, etag: row.etag ?? null };
  }
}


export async function purgeOfflineCache(opts?: { keepI18n?: boolean }) {
  const keepI18n = opts?.keepI18n ?? true;
  const db = await getDb();

  const fallbackKeysToRemove = [
    fbKey('resource:productos'),
    fbKey('resource:noticias'),
    fbKey('resource:eventos'),
    fbKey('resource:restaurantes'),
    fbKey('resource:manifest'),
    fbKey('kv:offline:manifestEtag:v2'),
    fbKey('kv:offline:manifestEtag:v3'),
    'offline:manifestEtag:v2',
    'offline:manifestEtag:v3',
    'offline:lastSyncAt:v2',
    'offline:lastSyncAt:v3',
  ];

  if (!db) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter((k) => fallbackKeysToRemove.includes(k));
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
      if (!keepI18n) {
        const i18nKeys = [fbKey('i18n:es'), fbKey('i18n:en')].filter((k) => keys.includes(k));
        if (i18nKeys.length) await AsyncStorage.multiRemove(i18nKeys);
      }
    } catch {}
    return;
  }

  await db.execAsync(`
    DELETE FROM resource_snapshots
    WHERE resource_key IN ('productos', 'noticias', 'eventos', 'restaurantes', 'manifest');
    DELETE FROM kv_store
    WHERE key IN ('offline:manifestEtag:v2', 'offline:manifestEtag:v3');
  `);

  if (!keepI18n) {
    try {
      await db.execAsync(`DELETE FROM i18n_cache WHERE lang IN ('es', 'en');`);
    } catch {}
  }

  try {
    await db.execAsync(`PRAGMA wal_checkpoint(TRUNCATE);`);
  } catch {}

  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => fallbackKeysToRemove.includes(k));
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  } catch {}
}

export async function clearSensitiveOfflineData(): Promise<void> {
  // Limpia solo datos vinculados a sesión/admin. El contenido público cacheado se conserva.
  try {
    const keys = await AsyncStorage.getAllKeys();
    const sensitive = keys.filter((key) =>
      key.includes("auth") ||
      key.includes("admin") ||
      key.includes("upload") ||
      key.includes("offline_queue")
    );
    if (sensitive.length) await AsyncStorage.multiRemove(sensitive);
  } catch {}
}
