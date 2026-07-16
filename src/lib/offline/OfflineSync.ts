import React from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState, type AppStateStatus } from "react-native";
import { offlineDownloadManager } from "./DownloadManager";
import { getOfflineImagesEnabled, warmProductImages } from "@/features/products/offlinePrefs";
import { registerBackgroundSyncTaskAsync } from "./backgroundSyncTask";

export function OfflineSync() {
  React.useEffect(() => {
    void offlineDownloadManager.init();
    void registerBackgroundSyncTaskAsync();

    const netUnsub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      void offlineDownloadManager.setOnline(online);
    });

    const appSub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        void offlineDownloadManager.resumePaused();
        void offlineDownloadManager.init();
        void registerBackgroundSyncTaskAsync();
        void getOfflineImagesEnabled().then((enabled) => {
          if (enabled) void warmProductImages();
        }).catch(() => {});
        return;
      }

      if (nextState === "background" || nextState === "inactive") {
        // No pausamos nada al minimizar. Al contrario: dejamos preparada la cola y
        // arrancamos/continuamos la descarga para que avance mientras la app quede abierta
        // en segundo plano. Si el usuario cierra la app por completo, Android/iOS la detienen
        // y se reanuda en la próxima apertura.
        void getOfflineImagesEnabled().then((enabled) => {
          if (enabled) void warmProductImages();
        }).catch(() => {});
      }
    });

    return () => {
      netUnsub();
      appSub.remove();
    };
  }, []);

  return null;
}
