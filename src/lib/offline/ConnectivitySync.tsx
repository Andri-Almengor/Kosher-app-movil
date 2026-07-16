import React from 'react';
import { InteractionManager } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { syncAllIfOnline } from '@/offline/sync';
import { warmProductImages, getOfflineImagesEnabled } from '@/features/products/offlinePrefs';
import { getProductsHomeCardConfig } from '@/features/admin/api/adminUiSettingsApi';
import { warmOfflineTranslations } from '@/lib/translate/warmTranslations';
import { useI18n } from '@/i18n/I18nProvider';

const RECONNECT_COOLDOWN_MS = 20_000;

export function ConnectivitySync() {
  const { lang } = useI18n();

  React.useEffect(() => {
    let lastOnline = false;
    let lastRunAt = 0;
    let running = false;
    let cancelled = false;

    const runReconnectSync = async () => {
      if (running || cancelled) return;
      const now = Date.now();
      if (now - lastRunAt < RECONNECT_COOLDOWN_MS) return;
      lastRunAt = now;
      running = true;

      try {
        const res = await syncAllIfOnline(() => {});
        if (res?.ok && !cancelled) {
          InteractionManager.runAfterInteractions(() => {
            if (cancelled) return;
            setTimeout(async () => {
              if (cancelled) return;
              try { await getProductsHomeCardConfig(); } catch {}
              try { await warmOfflineTranslations(lang); } catch {}
              try {
                if (await getOfflineImagesEnabled()) await warmProductImages();
              } catch {}
            }, 500);
          });
        }
      } finally {
        running = false;
      }
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      if (online && !lastOnline) void runReconnectSync();
      lastOnline = online;
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [lang]);

  return null;
}
