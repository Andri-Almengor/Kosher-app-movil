import React from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState, type AppStateStatus } from "react-native";
import { offlineDownloadManager } from "./DownloadManager";
import { getOfflineImagesEnabled, warmProductImages } from "@/features/products/offlinePrefs";
import { registerBackgroundSyncTaskAsync } from "./backgroundSyncTask";
import {
  enterBackgroundDownloadMode,
  exitBackgroundDownloadMode,
  installBackgroundDownloadDefaults,
} from "./downloadLifecycle";

export function OfflineSync() {
  React.useEffect(() => {
    installBackgroundDownloadDefaults();

    if (AppState.currentState === "background" || AppState.currentState === "inactive") {
      enterBackgroundDownloadMode();
    }

    void offlineDownloadManager.init();
    void registerBackgroundSyncTaskAsync();

    const netUnsub = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      void offlineDownloadManager.setOnline(online);
    });

    const appSub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        exitBackgroundDownloadMode();
        void offlineDownloadManager.resumePaused();
        void offlineDownloadManager.init();
        void registerBackgroundSyncTaskAsync();
        void getOfflineImagesEnabled()
          .then((enabled) => {
            if (enabled) void warmProductImages();
          })
          .catch(() => {});
        return;
      }

      if (nextState === "background" || nextState === "inactive") {
        // Los callbacks de progreso pueden quedar suspendidos al minimizar.
        // Desactivamos solamente el detector de descargas atascadas para evitar
        // que pause una transferencia nativa que continúa en segundo plano.
        enterBackgroundDownloadMode();

        void getOfflineImagesEnabled()
          .then((enabled) => {
            if (enabled) void warmProductImages();
          })
          .catch(() => {});
      }
    });

    return () => {
      exitBackgroundDownloadMode();
      netUnsub();
      appSub.remove();
    };
  }, []);

  return null;
}
