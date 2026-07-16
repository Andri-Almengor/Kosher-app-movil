import React from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshResourceIfOnline, loadCachedProductos, loadCachedNoticias, loadCachedEventos, loadCachedRestaurantes } from './sync';
import { initOfflineDb } from './sqliteStore';
import { subscribeOfflineSync } from './events';

type Key = 'productos' | 'noticias' | 'eventos' | 'restaurantes';

const LAST_SYNC_KEY = 'offline:lastSyncAt:v4';
const SYNC_COOLDOWN_MS = 5 * 60_000;

async function shouldSyncNow(force = false): Promise<boolean> {
  if (force) return true;
  try {
    const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const last = raw ? Number(raw) : 0;
    return !last || Date.now() - last > SYNC_COOLDOWN_MS;
  } catch {
    return true;
  }
}

async function markSyncNow() {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch {}
}

function sameByJson(a: unknown, b: unknown) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function useOfflineList<T = any>(key: Key) {
  const [items, setItems] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadCache = React.useCallback(async () => {
    await initOfflineDb();
    if (key === 'productos') return (await loadCachedProductos<T>()) as T[];
    if (key === 'noticias') return (await loadCachedNoticias<T>()) as T[];
    if (key === 'restaurantes') return (await loadCachedRestaurantes<T>()) as T[];
    return (await loadCachedEventos<T>()) as T[];
  }, [key]);

  const reloadFromCache = React.useCallback(async () => {
    const cached = await loadCache();
    setItems((prev) => (sameByJson(prev, cached) ? prev : cached));
  }, [loadCache]);

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await refreshResourceIfOnline(key, () => {});
      await markSyncNow();
      await reloadFromCache();
    } catch (e: any) {
      setError(e?.message ?? 'Error');
      await reloadFromCache();
    } finally {
      setRefreshing(false);
    }
  }, [key, reloadFromCache]);


  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      (async () => {
        try {
          await refreshResourceIfOnline(key, () => {});
          if (active) await reloadFromCache();
        } catch (e: any) {
          if (active) setError(e?.message ?? null);
        }
      })();

      return () => {
        active = false;
      };
    }, [key, reloadFromCache])
  );
  React.useEffect(() => {
    let mounted = true;

    const maybeSync = async () => {
      if (AppState.currentState !== 'active') return;
      if (!(await shouldSyncNow())) return;
      refreshResourceIfOnline(key, () => {}).then(async () => {
        await markSyncNow();
        if (mounted) await reloadFromCache();
      }).catch((e: any) => {
        if (mounted) setError(e?.message ?? null);
      });
    };

    (async () => {
      setLoading(true);
      setError(null);
      const cached = await loadCache();
      if (mounted) setItems(cached);
      if (mounted) setLoading(false);
      void maybeSync();
    })();

    const unsubscribeSync = subscribeOfflineSync(() => {
      if (mounted) void reloadFromCache();
    });
    const unsubscribeAppState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void maybeSync();
    });

    return () => {
      mounted = false;
      unsubscribeSync();
      unsubscribeAppState.remove();
    };
  }, [key, loadCache, reloadFromCache]);

  return { items, loading, refreshing, error, refresh };
}
