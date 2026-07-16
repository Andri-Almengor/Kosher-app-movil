import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OfflineResourceKind } from "./FileStorage";

const STORAGE_KEY = "offline:download-queue:v3";

export type OfflineQueueStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type OfflineQueueItem = {
  id: string;
  url: string;
  kind: OfflineResourceKind;
  explicitKey?: string | null;
  version?: string | number | null;
  priority: number;
  status: OfflineQueueStatus;
  createdAt: number;
  updatedAt: number;
  startedAt?: number | null;
  finishedAt?: number | null;
  retryCount: number;
  maxRetries: number;
  retryAt?: number | null;
  progressBytes: number;
  totalBytes: number;
  lastProgressAt?: number | null;
  lastError?: string | null;
  headers?: Record<string, string>;
  resumeData?: string | null;
  meta?: Record<string, any> | null;
};

export type OfflineQueueSnapshot = {
  items: OfflineQueueItem[];
  updatedAt: number;
};

function now() {
  return Date.now();
}

function sortItems(items: OfflineQueueItem[]) {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) {
      const weight = (s: OfflineQueueStatus) =>
        s === "running" ? 0 :
        s === "queued" ? 1 :
        s === "paused" ? 2 :
        s === "failed" ? 3 :
        s === "completed" ? 4 : 5;
      return weight(a.status) - weight(b.status);
    }
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.createdAt - b.createdAt;
  });
}

export class OfflineQueueStore {
  private snapshot: OfflineQueueSnapshot = { items: [], updatedAt: now() };
  private loaded = false;

  async load() {
    if (this.loaded) return this.snapshot;

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OfflineQueueSnapshot;
        this.snapshot = {
          items: Array.isArray(parsed.items) ? parsed.items : [],
          updatedAt: parsed.updatedAt ?? now(),
        };
      }
    } catch {
      this.snapshot = { items: [], updatedAt: now() };
    }

    this.loaded = true;
    return this.snapshot;
  }

  getSnapshot() {
    return this.snapshot;
  }

  private async persist() {
    this.snapshot.updatedAt = now();
    this.snapshot.items = sortItems(this.snapshot.items);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
  }

  async replaceAll(items: OfflineQueueItem[]) {
    this.snapshot.items = sortItems(items);
    await this.persist();
    return this.snapshot;
  }

  async upsert(item: OfflineQueueItem) {
    const idx = this.snapshot.items.findIndex((x) => x.id === item.id);
    if (idx >= 0) this.snapshot.items[idx] = item;
    else this.snapshot.items.push(item);
    await this.persist();
    return item;
  }

  async patch(id: string, patch: Partial<OfflineQueueItem>) {
    const current = this.snapshot.items.find((x) => x.id === id);
    if (!current) return null;

    const next: OfflineQueueItem = {
      ...current,
      ...patch,
      updatedAt: now(),
    };

    const idx = this.snapshot.items.findIndex((x) => x.id === id);
    this.snapshot.items[idx] = next;
    await this.persist();
    return next;
  }

  async remove(id: string) {
    this.snapshot.items = this.snapshot.items.filter((x) => x.id !== id);
    await this.persist();
  }

  async clearCompleted() {
    this.snapshot.items = this.snapshot.items.filter(
      (x) => x.status !== "completed" && x.status !== "cancelled"
    );
    await this.persist();
  }

  async clearAll() {
    this.snapshot.items = [];
    await this.persist();
  }

  findById(id: string) {
    return this.snapshot.items.find((x) => x.id === id) ?? null;
  }

  findDuplicate(params: {
    url: string;
    kind: OfflineResourceKind;
    explicitKey?: string | null;
    version?: string | number | null;
  }) {
    const { url, kind, explicitKey, version } = params;
    return (
      this.snapshot.items.find(
        (x) =>
          x.url === url &&
          x.kind === kind &&
          (x.explicitKey ?? null) === (explicitKey ?? null) &&
          String(x.version ?? "") === String(version ?? "")
      ) ?? null
    );
  }
}