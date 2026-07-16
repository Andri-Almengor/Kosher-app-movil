import * as FileSystem from "expo-file-system/legacy";
import { useSyncExternalStore } from "react";
import {
  OfflineQueueStore,
  type OfflineQueueItem,
  type OfflineQueueSnapshot,
} from "./OfflineQueue";
import {
  ensureOfflineDirs,
  getFinalPath,
  getTempPath,
  fileExists,
  deleteFileIfExists,
  commitTempFile,
  cleanupOrphanTempFiles,
  type OfflineResourceKind,
} from "./FileStorage";

type DownloadProgress = {
  completed: number;
  total: number;
  failed: number;
  running: number;
  queued: number;
  paused: number;
  bytesWritten: number;
  bytesExpected: number;
  percent: number;
};

export type DownloadManagerState = {
  initialized: boolean;
  processing: boolean;
  isOnline: boolean;
  lastError?: string | null;
  queue: OfflineQueueSnapshot;
  progress: DownloadProgress;
};

export type EnqueueInput = {
  id?: string;
  url: string;
  kind: OfflineResourceKind;
  explicitKey?: string | null;
  version?: string | number | null;
  priority?: number;
  headers?: Record<string, string>;
  maxRetries?: number;
  meta?: Record<string, any> | null;
};

const MAX_CONCURRENCY = 3;
const STALL_TIMEOUT_MS = 25_000;
const PROGRESS_PERSIST_THROTTLE_MS = 600;
const BASE_RETRY_DELAY_MS = 3_000;
const MAX_RETRY_DELAY_MS = 60_000;

function now() {
  return Date.now();
}

function makeId(input: { url: string; kind: OfflineResourceKind; version?: string | number | null }) {
  const raw = `${input.kind}::${input.url}::${String(input.version ?? "")}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) hash = (hash * 33) ^ raw.charCodeAt(i);
  return `dl_${(hash >>> 0).toString(16)}`;
}

function calcProgress(items: OfflineQueueItem[]): DownloadProgress {
  const completed = items.filter((x) => x.status === "completed").length;
  const failed = items.filter((x) => x.status === "failed").length;
  const running = items.filter((x) => x.status === "running").length;
  const queued = items.filter((x) => x.status === "queued").length;
  const paused = items.filter((x) => x.status === "paused").length;
  const total = items.length;
  const bytesWritten = items.reduce((sum, x) => sum + (x.progressBytes || 0), 0);
  const bytesExpected = items.reduce((sum, x) => sum + (x.totalBytes || 0), 0);
  const percent = bytesExpected > 0 ? Math.round((bytesWritten / bytesExpected) * 100) : total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    completed,
    total,
    failed,
    running,
    queued,
    paused,
    bytesWritten,
    bytesExpected,
    percent,
  };
}

class DownloadManager {
  private store = new OfflineQueueStore();
  private listeners = new Set<() => void>();
  private state: DownloadManagerState = {
    initialized: false,
    processing: false,
    isOnline: true,
    lastError: null,
    queue: { items: [], updatedAt: 0 },
    progress: {
      completed: 0,
      total: 0,
      failed: 0,
      running: 0,
      queued: 0,
      paused: 0,
      bytesWritten: 0,
      bytesExpected: 0,
      percent: 0,
    },
  };

  private active = new Map<string, FileSystem.DownloadResumable>();
  private stalledWatchers = new Map<string, ReturnType<typeof setInterval>>();
  private lastPersistAt = new Map<string, number>();
  private bootPromise: Promise<void> | null = null;
  private processLoopPromise: Promise<void> | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.state;

  private emit() {
    this.state = {
      ...this.state,
      queue: this.store.getSnapshot(),
      progress: calcProgress(this.store.getSnapshot().items),
    };
    this.listeners.forEach((fn) => fn());
  }

  async init() {
    if (this.bootPromise) return this.bootPromise;

    this.bootPromise = (async () => {
      await ensureOfflineDirs();
      await cleanupOrphanTempFiles();
      await this.store.load();

      // Evita items colgados tras cierre abrupto
      const healed = this.store.getSnapshot().items.map((item) => {
        if (item.status === "running") {
          return {
            ...item,
            status: item.resumeData ? ("paused" as const) : ("queued" as const),
            updatedAt: now(),
          };
        }
        return item;
      });

      await this.store.replaceAll(healed);
      this.state.initialized = true;
      this.emit();
      await this.kick();
    })();

    return this.bootPromise;
  }

  async setOnline(value: boolean) {
    this.state.isOnline = value;
    this.emit();

    if (value) {
      await this.resumePaused();
      await this.kick();
    }
  }

  async enqueue(input: EnqueueInput, options: { autoStart?: boolean } = {}) {
    await this.init();
    const autoStart = options.autoStart !== false;

    const duplicate = this.store.findDuplicate({
      url: input.url,
      kind: input.kind,
      explicitKey: input.explicitKey ?? null,
      version: input.version ?? null,
    });

    if (duplicate) {
      if (duplicate.status === "failed" || duplicate.status === "cancelled") {
        await this.store.patch(duplicate.id, {
          status: "queued",
          retryAt: null,
          lastError: null,
        });
        this.emit();
        if (autoStart) await this.kick();
      }
      return this.store.findById(duplicate.id)!;
    }

    const item: OfflineQueueItem = {
      id: input.id ?? makeId({ url: input.url, kind: input.kind, version: input.version }),
      url: input.url,
      kind: input.kind,
      explicitKey: input.explicitKey ?? null,
      version: input.version ?? null,
      priority: input.priority ?? 0,
      status: "queued",
      createdAt: now(),
      updatedAt: now(),
      retryCount: 0,
      maxRetries: Math.max(0, input.maxRetries ?? 4),
      retryAt: null,
      progressBytes: 0,
      totalBytes: 0,
      lastProgressAt: null,
      lastError: null,
      headers: input.headers,
      resumeData: null,
      meta: input.meta ?? null,
    };

    await this.store.upsert(item);
    this.emit();
    if (autoStart) await this.kick();
    return item;
  }

  async enqueueMany(inputs: EnqueueInput[], options: { autoStart?: boolean } = {}) {
    await this.init();
    const autoStart = options.autoStart !== false;
    const out: OfflineQueueItem[] = [];
    for (const input of inputs) {
      out.push(await this.enqueue(input, { autoStart: false }));
    }
    if (autoStart) await this.kick();
    return out;
  }

  async processPending(options: { maxItems?: number; maxDurationMs?: number } = {}) {
    await this.init();
    if (!this.state.isOnline) return { ok: false, reason: "offline" as const };
    if (this.processLoopPromise) await this.processLoopPromise.catch(() => {});

    // Por defecto procesamos toda la cola. Esto permite que, si el usuario deja la app
    // abierta en segundo plano, las descargas sigan avanzando hasta que el sistema operativo
    // suspenda el proceso o hasta completar el contenido.
    const maxItems = Math.max(1, options.maxItems ?? Number.MAX_SAFE_INTEGER);
    const maxDurationMs = Math.max(10_000, options.maxDurationMs ?? 6 * 60 * 60 * 1000);
    const deadlineAt = now() + maxDurationMs;
    await this.processLoop({ maxItems, deadlineAt });
    return { ok: true as const, progress: this.state.progress };
  }

  async pauseActive() {
    const ids = Array.from(this.active.keys());
    await Promise.all(ids.map((id) => this.pauseItem(id)));
    this.emit();
  }

  async pauseItem(id: string) {
    const active = this.active.get(id);
    const item = this.store.findById(id);
    if (!active || !item) return;

    try {
      const paused: any = await active.pauseAsync();
      await this.store.patch(id, {
        status: "paused",
        resumeData: paused?.resumeData ?? null,
      });
    } catch (error: any) {
      await this.store.patch(id, {
        status: "paused",
        lastError: error?.message ?? String(error),
      });
    } finally {
      this.stopStallWatcher(id);
      this.active.delete(id);
    }
  }

  async resumePaused() {
    const items = this.store.getSnapshot().items;
    for (const item of items) {
      if (item.status === "paused") {
        await this.store.patch(item.id, {
          status: "queued",
          retryAt: null,
        });
      }
    }
    this.emit();
  }

  async cancelItem(id: string) {
    const active = this.active.get(id);
    if (active) {
      try {
        await active.pauseAsync();
      } catch {}
      this.active.delete(id);
      this.stopStallWatcher(id);
    }

    const item = this.store.findById(id);
    if (!item) return;

    await deleteFileIfExists(getTempPath(id));
    await this.store.patch(id, {
      status: "cancelled",
      resumeData: null,
      lastError: null,
    });
    this.emit();
  }

  async clearCompleted() {
    await this.store.clearCompleted();
    this.emit();
  }

  async clearAll() {
    await this.pauseActive();
    await this.store.clearAll();
    this.emit();
  }

  async retryFailed(id?: string) {
    const items = this.store.getSnapshot().items;
    const filtered = id ? items.filter((x) => x.id === id) : items.filter((x) => x.status === "failed");
    for (const item of filtered) {
      await this.store.patch(item.id, {
        status: "queued",
        retryAt: null,
        lastError: null,
      });
    }
    this.emit();
    await this.kick();
  }

  private nextRunnableItem() {
    const items = this.store.getSnapshot().items
      .filter((item) => {
        if (item.status !== "queued") return false;
        if (item.retryAt && item.retryAt > now()) return false;
        return true;
      })
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.createdAt - b.createdAt;
      });

    return items[0] ?? null;
  }

  private countRunning() {
    return this.store.getSnapshot().items.filter((x) => x.status === "running").length;
  }

  private async kick() {
    if (!this.state.initialized) return;
    if (!this.state.isOnline) return;
    if (this.processLoopPromise) return;

    this.processLoopPromise = this.processLoop().finally(() => {
      this.processLoopPromise = null;
    });

    await this.processLoopPromise;
  }

  private async processLoop(options: { maxItems?: number; deadlineAt?: number } = {}) {
    if (this.state.processing) return;
    this.state.processing = true;
    this.emit();

    const running = new Set<Promise<void>>();

    try {
      let processed = 0;

      while (this.state.isOnline) {
        if (options.deadlineAt && now() >= options.deadlineAt) break;

        while (running.size < MAX_CONCURRENCY) {
          if (options.maxItems && processed >= options.maxItems) break;
          if (options.deadlineAt && now() >= options.deadlineAt) break;

          const next = this.nextRunnableItem();
          if (!next) break;

          processed += 1;
          const task = this.runOne(next.id).finally(() => running.delete(task));
          running.add(task);
        }

        if (!running.size) break;
        await Promise.race(Array.from(running));
      }

      if (!options.deadlineAt || now() < options.deadlineAt) {
        await Promise.allSettled(Array.from(running));
      }
    } finally {
      this.state.processing = false;
      this.emit();
    }
  }

  private startStallWatcher(id: string) {
    this.stopStallWatcher(id);

    const interval = setInterval(async () => {
      const item = this.store.findById(id);
      if (!item || item.status !== "running") {
        this.stopStallWatcher(id);
        return;
      }

      const lastProgressAt = item.lastProgressAt ?? item.startedAt ?? item.updatedAt;
      if (now() - lastProgressAt < STALL_TIMEOUT_MS) return;

      const resumable = this.active.get(id);
      if (!resumable) {
        this.stopStallWatcher(id);
        return;
      }

      try {
        const paused: any = await resumable.pauseAsync();
        this.active.delete(id);
        this.stopStallWatcher(id);

        await this.store.patch(id, {
          status: "queued",
          resumeData: paused?.resumeData ?? null,
          lastError: "Stalled download recovered automatically.",
          retryAt: now() + 1500,
        });

        this.emit();
        await this.kick();
      } catch (error: any) {
        this.active.delete(id);
        this.stopStallWatcher(id);
        await this.failOrRetry(id, error?.message ?? "Stalled download and pause failed.");
      }
    }, 3000);

    this.stalledWatchers.set(id, interval);
  }

  private stopStallWatcher(id: string) {
    const interval = this.stalledWatchers.get(id);
    if (interval) clearInterval(interval);
    this.stalledWatchers.delete(id);
  }

  private shouldPersistProgress(id: string) {
    const prev = this.lastPersistAt.get(id) ?? 0;
    if (now() - prev > PROGRESS_PERSIST_THROTTLE_MS) {
      this.lastPersistAt.set(id, now());
      return true;
    }
    return false;
  }

  private async runOne(id: string) {
    const item = this.store.findById(id);
    if (!item) return;

    const finalPath = getFinalPath({
      url: item.url,
      kind: item.kind,
      version: item.version,
      explicitKey: item.explicitKey,
    });

    const alreadyDone = await fileExists(finalPath);
    if (alreadyDone) {
      await this.store.patch(id, {
        status: "completed",
        finishedAt: now(),
        progressBytes: item.totalBytes || item.progressBytes,
        totalBytes: item.totalBytes || item.progressBytes,
        resumeData: null,
        lastError: null,
      });
      this.emit();
      return;
    }

    const tempPath = getTempPath(id);
    if (!item.resumeData) {
      await deleteFileIfExists(tempPath);
    }

    const callback: FileSystem.FileSystemNetworkTaskProgressCallback<FileSystem.DownloadProgressData> = async (data) => {
      const patch = {
        progressBytes: data.totalBytesWritten ?? 0,
        totalBytes: data.totalBytesExpectedToWrite ?? 0,
        lastProgressAt: now(),
      };
      if (this.shouldPersistProgress(id)) {
        await this.store.patch(id, patch);
      } else {
        const current = this.store.findById(id);
        if (current) {
          Object.assign(current, patch, { updatedAt: now() });
        }
      }
      this.emit();
    };

    const resumable = new FileSystem.DownloadResumable(
      item.url,
      tempPath,
      { headers: item.headers ?? {} },
      callback,
      item.resumeData ?? undefined
    );

    this.active.set(id, resumable);
    this.startStallWatcher(id);

    await this.store.patch(id, {
      status: "running",
      startedAt: item.startedAt ?? now(),
      lastProgressAt: now(),
      lastError: null,
    });
    this.emit();

    try {
      const result = item.resumeData ? await resumable.resumeAsync() : await resumable.downloadAsync();

      if (!result?.uri) {
        throw new Error("Download finished without a file URI.");
      }

      await commitTempFile(result.uri, finalPath);

      await this.store.patch(id, {
        status: "completed",
        finishedAt: now(),
        retryAt: null,
        resumeData: null,
        lastError: null,
      });
    } catch (error: any) {
      await deleteFileIfExists(tempPath);
      await this.failOrRetry(id, error?.message ?? String(error));
    } finally {
      this.active.delete(id);
      this.stopStallWatcher(id);
      this.emit();
    }
  }

  private async failOrRetry(id: string, message: string) {
    const item = this.store.findById(id);
    if (!item) return;

    const nextRetryCount = (item.retryCount ?? 0) + 1;
    if (nextRetryCount <= item.maxRetries) {
      const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, nextRetryCount - 1), MAX_RETRY_DELAY_MS);

      await this.store.patch(id, {
        status: "queued",
        retryCount: nextRetryCount,
        retryAt: now() + delay,
        resumeData: null,
        lastError: message,
      });

      setTimeout(() => {
        void this.kick();
      }, delay + 50);
      return;
    }

    await this.store.patch(id, {
      status: "failed",
      retryCount: nextRetryCount,
      retryAt: null,
      resumeData: null,
      lastError: message,
      finishedAt: now(),
    });

    this.state.lastError = message;
  }
}

export const offlineDownloadManager = new DownloadManager();

export function useOfflineDownloadManager() {
  return useSyncExternalStore(
    offlineDownloadManager.subscribe,
    offlineDownloadManager.getState,
    offlineDownloadManager.getState
  );
}