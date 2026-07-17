import * as FileSystem from "expo-file-system/legacy";
import { offlineDownloadManager } from "./DownloadManager";

type DownloadManagerInternals = {
  active?: Map<string, unknown>;
  stalledWatchers?: Map<string, unknown>;
  startStallWatcher?: (id: string) => void;
  stopStallWatcher?: (id: string) => void;
  __backgroundSafeOriginalStartStallWatcher?: (id: string) => void;
  __backgroundSafeMode?: boolean;
};

type DownloadResumableInternals = {
  _options?: Record<string, unknown>;
};

const PATCH_FLAG = "__kosherBackgroundSessionPatched";

/**
 * expo-file-system/legacy conserva la descarga nativa en iOS mediante una
 * sesión background. Este parche defensivo fuerza esa opción antes de iniciar
 * o reanudar cada DownloadResumable cuando la versión instalada la expone.
 */
export function installBackgroundDownloadDefaults() {
  const DownloadResumable = (FileSystem as any).DownloadResumable;
  const proto = DownloadResumable?.prototype as any;
  const backgroundSessionType = (FileSystem as any).FileSystemSessionType?.BACKGROUND;

  if (!proto || proto[PATCH_FLAG] || backgroundSessionType == null) return;

  const wrap = (methodName: "downloadAsync" | "resumeAsync") => {
    const original = proto[methodName];
    if (typeof original !== "function") return;

    proto[methodName] = function backgroundSafeDownload(this: DownloadResumableInternals, ...args: unknown[]) {
      this._options = {
        ...(this._options ?? {}),
        sessionType: backgroundSessionType,
      };
      return original.apply(this, args);
    };
  };

  wrap("downloadAsync");
  wrap("resumeAsync");
  proto[PATCH_FLAG] = true;
}

function getManagerInternals() {
  return offlineDownloadManager as unknown as DownloadManagerInternals;
}

/**
 * Al minimizar, React Native puede dejar de entregar callbacks de progreso.
 * El monitor de descargas no debe interpretar ese silencio como un bloqueo y
 * pausar una transferencia que continúa de forma nativa.
 */
export function enterBackgroundDownloadMode() {
  const manager = getManagerInternals();

  if (!manager.__backgroundSafeOriginalStartStallWatcher && manager.startStallWatcher) {
    manager.__backgroundSafeOriginalStartStallWatcher = manager.startStallWatcher.bind(offlineDownloadManager);
  }

  if (!manager.__backgroundSafeMode) {
    manager.startStallWatcher = () => {};
    manager.__backgroundSafeMode = true;
  }

  const watcherIds = Array.from(manager.stalledWatchers?.keys?.() ?? []);
  for (const id of watcherIds) manager.stopStallWatcher?.(id);
}

/**
 * Al regresar al app se restablece la detección de bloqueos únicamente para
 * las transferencias que siguen activas y se reconcilia la cola normalmente.
 */
export function exitBackgroundDownloadMode() {
  const manager = getManagerInternals();
  const original = manager.__backgroundSafeOriginalStartStallWatcher;

  if (original) manager.startStallWatcher = original;
  manager.__backgroundSafeMode = false;

  const activeIds = Array.from(manager.active?.keys?.() ?? []);
  for (const id of activeIds) original?.(id);
}
