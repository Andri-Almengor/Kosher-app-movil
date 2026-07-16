import { Platform } from "react-native";
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncAllIfOnline } from "@/offline/sync";
import { getOfflineImagesEnabled, warmProductImages } from "@/features/products/offlinePrefs";
import { offlineDownloadManager } from "./DownloadManager";

export const OFFLINE_BACKGROUND_SYNC_TASK = "kosher-offline-background-sync";

const LAST_NOTIFICATION_KEY = "offline:bg:lastCompletedNotification:v1";
const BACKGROUND_MINIMUM_INTERVAL_MINUTES = 15;
const BACKGROUND_MAX_ITEMS_PER_RUN = 24;
const BACKGROUND_MAX_DURATION_MS = 100_000;

async function maybeNotifyDownloadsCompleted() {
  const state = offlineDownloadManager.getState();
  const progress = state.progress;
  if (!progress.total || progress.completed < progress.total || progress.failed > 0) return;

  const fingerprint = `${progress.completed}:${state.queue.updatedAt}`;
  const last = await AsyncStorage.getItem(LAST_NOTIFICATION_KEY);
  if (last === fingerprint) return;

  const permissions = await Notifications.getPermissionsAsync().catch(() => null);
  if (permissions?.status !== "granted") return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Contenido descargado",
      body: "Kosher Costa Rica terminó de sincronizar el contenido offline.",
      sound: false,
    },
    trigger: null as any,
  }).catch(() => {});

  await AsyncStorage.setItem(LAST_NOTIFICATION_KEY, fingerprint);
}

if (!TaskManager.isTaskDefined(OFFLINE_BACKGROUND_SYNC_TASK)) {
TaskManager.defineTask(OFFLINE_BACKGROUND_SYNC_TASK, async () => {
  try {
    await offlineDownloadManager.init();
    await syncAllIfOnline(() => {});

    if (await getOfflineImagesEnabled()) {
      await warmProductImages({ autoStart: false });
      await offlineDownloadManager.processPending({
        maxItems: BACKGROUND_MAX_ITEMS_PER_RUN,
        maxDurationMs: BACKGROUND_MAX_DURATION_MS,
      });
      await maybeNotifyDownloadsCompleted();
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
}

export async function registerBackgroundSyncTaskAsync() {
  if (Platform.OS === "web") return { ok: false, reason: "web" as const };

  const status = await BackgroundTask.getStatusAsync().catch(() => null);
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    return { ok: false, reason: "restricted" as const, status };
  }

  const registered = await TaskManager.isTaskRegisteredAsync(OFFLINE_BACKGROUND_SYNC_TASK).catch(() => false);
  if (!registered) {
    await BackgroundTask.registerTaskAsync(OFFLINE_BACKGROUND_SYNC_TASK, {
      minimumInterval: BACKGROUND_MINIMUM_INTERVAL_MINUTES,
    });
  }

  return { ok: true as const };
}

export async function unregisterBackgroundSyncTaskAsync() {
  const registered = await TaskManager.isTaskRegisteredAsync(OFFLINE_BACKGROUND_SYNC_TASK).catch(() => false);
  if (registered) {
    await BackgroundTask.unregisterTaskAsync(OFFLINE_BACKGROUND_SYNC_TASK);
  }
}

export async function triggerBackgroundSyncForTestingAsync() {
  if (__DEV__) {
    return BackgroundTask.triggerTaskWorkerForTestingAsync();
  }
  return false;
}
