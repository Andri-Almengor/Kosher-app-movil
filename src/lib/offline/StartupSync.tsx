import React, { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncAllIfOnline } from '@/offline/sync';
import { initOfflineDb } from '@/offline/sqliteStore';
import { getOfflineImagesEnabled, setOfflineImagesEnabled, warmProductImages } from '@/features/products/offlinePrefs';
import { warmOfflineTranslations } from '@/lib/translate/warmTranslations';
import { useI18n } from '@/i18n/I18nProvider';
import { getProductsHomeCardConfig } from '@/features/admin/api/adminUiSettingsApi';

const STARTUP_SYNC_KEY = 'startupSync:lastRun:v2';
const STARTUP_SYNC_COOLDOWN_MS = 5 * 60_000;

export function StartupSync() {
  const { lang } = useI18n();

  useEffect(() => {
    let mounted = true;
    let cancelled = false;

    (async () => {
      try {
        await initOfflineDb();
        const lastRun = Number((await AsyncStorage.getItem(STARTUP_SYNC_KEY)) ?? 0);
        if (Date.now() - lastRun < STARTUP_SYNC_COOLDOWN_MS) return;
        await AsyncStorage.setItem(STARTUP_SYNC_KEY, String(Date.now()));
        const res = await syncAllIfOnline(() => {});
        if (!mounted || cancelled) return;

        if (!(await getOfflineImagesEnabled())) {
          await setOfflineImagesEnabled(true);
        }

        if (res.ok) {
          InteractionManager.runAfterInteractions(() => {
            if (cancelled) return;
            setTimeout(() => {
              if (cancelled) return;
              void getProductsHomeCardConfig().catch(() => {});
              void warmOfflineTranslations(lang);
              void warmProductImages();
            }, 600);
          });
        }
      } catch {}
    })();

    return () => {
      mounted = false;
      cancelled = true;
    };
  }, [lang]);

  return null;
}
