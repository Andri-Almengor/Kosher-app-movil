import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { api } from "../lib/api/client";
import {
  getResourceItems,
  getResourceSnapshot,
  initOfflineDb,
  saveResourceSnapshot,
  setKv,
  getKv,
} from "./sqliteStore";
import { emitOfflineSync } from "./events";
import { notifyForNewNewsItems } from "@/lib/notifications/newsNotifications";

export type ManifestResourceMeta = {
  lastUpdatedAt: string | null;
  count: number;
  etag: string;
};

export type Manifest = {
  generatedAt: string;
  productos: ManifestResourceMeta;
  noticias: ManifestResourceMeta;
  eventos: ManifestResourceMeta;
  restaurantes: ManifestResourceMeta;
};

type DeltaResponse<T> = {
  key: string;
  since: string | null;
  items: T[];
  deletedIds: Array<string | number>;
  lastUpdatedAt: string | null;
};

const K = {
  manifestEtag: "offline:manifestEtag:v3",
  lastSyncAt: "offline:lastSyncAt:v3",
} as const;

let inFlightSync: Promise<any> | null = null;
let lastAttemptAt = 0;
const MIN_SYNC_GAP_MS = 15000;

type ResourceKey = "productos" | "noticias" | "eventos" | "restaurantes";

async function isOnline(): Promise<boolean> {
  const st = await NetInfo.fetch();
  return !!st.isConnected && st.isInternetReachable !== false;
}

function normalizeId(value: any): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function getItemId(item: any): string | null {
  return normalizeId(item?.id ?? item?._id ?? item?.uuid);
}

function mergeById<T extends { id?: any }>(
  base: T[],
  delta: T[],
  deletedIds: Array<string | number> = []
): T[] {
  const map = new Map<string, T>();
  const noId: T[] = [];

  const upsert = (it: T) => {
    const id = getItemId(it);
    if (!id) {
      noId.push(it);
      return;
    }
    map.set(id, it);
  };

  for (const it of base ?? []) upsert(it);
  for (const it of delta ?? []) upsert(it);

  for (const raw of deletedIds ?? []) {
    const id = normalizeId(raw);
    if (id) map.delete(id);
  }

  return [...map.values(), ...noId];
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function restaurantItemHasBilingualShape(item: any): boolean {
  if (!item || typeof item !== "object") return false;

  const bilingualCore = [
    item.nombreEs,
    item.nombreEn,
    item.tipoEs,
    item.tipoEn,
    item.ubicacionEs,
    item.ubicacionEn,
    item.acercaDeEs,
    item.acercaDeEn,
    item.horarioEs,
    item.horarioEn,
    item.descripTelefonoEs,
    item.descripTelefonoEn,
    item.descripWhatsappEs,
    item.descripWhatsappEn,
    item.descripCorreoEs,
    item.descripCorreoEn,
    item.contactoEs,
    item.contactoEn,
    item.direccionEs,
    item.direccionEn,
  ].some(hasText);

  return bilingualCore;
}

async function restaurantsCacheNeedsRepair(): Promise<boolean> {
  const local = await getResourceSnapshot<any>("restaurantes");
  const cached = Array.isArray(local?.value) ? local.value : [];

  if (!cached.length) return false;

  return cached.some((item) => !restaurantItemHasBilingualShape(item));
}

export async function loadCachedProductos<T = any>(): Promise<T[]> {
  await initOfflineDb();
  return getResourceItems<T>("productos");
}

export async function loadCachedNoticias<T = any>(): Promise<T[]> {
  await initOfflineDb();
  return getResourceItems<T>("noticias");
}

export async function loadCachedEventos<T = any>(): Promise<T[]> {
  await initOfflineDb();
  return getResourceItems<T>("eventos");
}

export async function loadCachedRestaurantes<T = any>(): Promise<T[]> {
  await initOfflineDb();
  return getResourceItems<T>("restaurantes");
}

export async function getLastSyncAt(): Promise<string | null> {
  return AsyncStorage.getItem(K.lastSyncAt);
}

async function fetchFullResource<T = any>(
  key: ResourceKey
): Promise<DeltaResponse<T>> {
  const res = await api.get<DeltaResponse<T>>(`/sync/${key}`, {
    validateStatus: (s: number) => s >= 200 && s < 300,
  } as any);

  return res.data;
}

async function forceReplaceResource<T = any>(
  key: ResourceKey,
  remoteMeta: ManifestResourceMeta,
  log: (...args: any[]) => void
): Promise<void> {
  log(`[SYNC] ${key}: reseed completo forzado`);
  const full = await fetchFullResource<T>(key);

  await saveResourceSnapshot(key, full.items ?? [], {
    etag: remoteMeta.etag,
    lastUpdatedAt: full.lastUpdatedAt ?? remoteMeta.lastUpdatedAt ?? null,
  });

  log(`[SYNC] ${key}: cache reemplazada completa (${full.items?.length ?? 0})`);
}

async function repairRestaurantsCacheIfNeeded(
  log: (...args: any[]) => void
): Promise<boolean> {
  const needsRepair = await restaurantsCacheNeedsRepair();
  if (!needsRepair) return false;

  log("[SYNC] restaurantes: cache vieja detectada sin campos bilingües → reseed");

  const manifestRes = await api.get<Manifest>("/sync/manifest", {
    validateStatus: (s: number) => s >= 200 && s < 300,
  } as any);

  const remoteMeta = manifestRes.data?.restaurantes;
  if (!remoteMeta) return false;

  await forceReplaceResource("restaurantes", remoteMeta, log);
  return true;
}

export async function refreshResourceIfOnline<T extends { id: any } = any>(
  key: ResourceKey,
  log: (...args: any[]) => void = () => {}
): Promise<{ ok: true; changed: true } | { ok: false; reason: string; error?: string }> {
  await initOfflineDb();

  if (!(await isOnline())) {
    log(`[OFFLINE] ${key}: no internet, usando cache local`);
    return { ok: false, reason: "offline" };
  }

  try {
    const manifestRes = await api.get<Manifest>("/sync/manifest", {
      validateStatus: (s: number) => s >= 200 && s < 300,
      params: { _t: Date.now() },
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    } as any);

    const remoteMeta = manifestRes.data?.[key];
    const full = await api.get<DeltaResponse<T>>(`/sync/${key}`, {
      validateStatus: (s: number) => s >= 200 && s < 300,
      params: { _t: Date.now() },
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    } as any);

    await saveResourceSnapshot(key, full.data.items ?? [], {
      etag: remoteMeta?.etag ?? String(Date.now()),
      lastUpdatedAt: full.data.lastUpdatedAt ?? remoteMeta?.lastUpdatedAt ?? new Date().toISOString(),
    });

    await AsyncStorage.setItem(K.lastSyncAt, String(Date.now()));
    await emitOfflineSync();

    log(`[SYNC] ${key}: recurso actualizado completo (${full.data.items?.length ?? 0})`);
    return { ok: true, changed: true };
  } catch (e: any) {
    log(`[SYNC] ${key}: error refrescando recurso`, e?.message ?? e);
    return { ok: false, reason: "error", error: e?.message ?? String(e) };
  }
}

export async function syncAllIfOnline(
  log: (...args: any[]) => void = () => {}
): Promise<any> {
  if (inFlightSync) return inFlightSync;

  const now = Date.now();
  if (now - lastAttemptAt < MIN_SYNC_GAP_MS) {
    return { ok: false, reason: "cooldown" as const };
  }
  lastAttemptAt = now;

  inFlightSync = (async () => {
    await initOfflineDb();

    if (!(await isOnline())) {
      log("[OFFLINE] no internet, usando cache SQLite local");
      return { ok: false, reason: "offline" as const };
    }

    const prevManifestEtag =
      (await getKv(K.manifestEtag)) ||
      (await AsyncStorage.getItem(K.manifestEtag));

    try {
      const res = await api.get<Manifest>("/sync/manifest", {
        headers: prevManifestEtag
          ? { "If-None-Match": prevManifestEtag }
          : undefined,
        validateStatus: (s: number) => (s >= 200 && s < 300) || s === 304,
      } as any);

      if (res.status === 304) {
        const repairedRestaurants = await repairRestaurantsCacheIfNeeded(log);

        await AsyncStorage.setItem(K.lastSyncAt, String(Date.now()));

        if (repairedRestaurants) {
          await emitOfflineSync();
          return {
            ok: true,
            changed: true as const,
            repairedRestaurants: true as const,
          };
        }

        log("[SYNC] manifest 304 (sin cambios)");
        return { ok: true, changed: false as const };
      }

      const manifest = res.data;
      const newManifestEtag = (res.headers as any)?.etag ?? null;

      if (newManifestEtag) {
        await setKv(K.manifestEtag, String(newManifestEtag));
        await AsyncStorage.setItem(K.manifestEtag, String(newManifestEtag));
      }

      await saveResourceSnapshot("manifest", [manifest] as any, {
        etag: newManifestEtag,
        lastUpdatedAt: manifest.generatedAt,
      });

      await Promise.all([
        syncResource("productos", manifest.productos, log),
        syncResource("noticias", manifest.noticias, log),
        syncResource("eventos", manifest.eventos, log),
        syncResource("restaurantes", manifest.restaurantes, log),
      ]);

      try {
        const noticiasCache = await getResourceItems<any>("noticias");
        await notifyForNewNewsItems(noticiasCache as any, {});
      } catch (notificationError: any) {
        log(
          "[SYNC] notifications error:",
          notificationError?.message ?? notificationError
        );
      }

      await AsyncStorage.setItem(K.lastSyncAt, String(Date.now()));
      await emitOfflineSync();

      return { ok: true, changed: true as const };
    } catch (e: any) {
      log("[SYNC] error:", e?.message ?? e);
      return {
        ok: false,
        reason: "error" as const,
        error: e?.message ?? String(e),
      };
    }
  })();

  try {
    return await inFlightSync;
  } finally {
    inFlightSync = null;
  }
}

async function syncResource<T extends { id: any } = any>(
  key: ResourceKey,
  remoteMeta: ManifestResourceMeta,
  log: (...args: any[]) => void
): Promise<void> {
  const local = await getResourceSnapshot<T>(key);
  const localEtag = local?.etag ?? null;
  const localCount = local?.itemCount ?? 0;

  if (
    localEtag &&
    localEtag === remoteMeta.etag &&
    localCount === remoteMeta.count &&
    localCount >= 0
  ) {
    if (key === "restaurantes" && (await restaurantsCacheNeedsRepair())) {
      log("[SYNC] restaurantes: etag igual, pero snapshot viejo → reseed completo");
      await forceReplaceResource<T>(key, remoteMeta, log);
      return;
    }

    log(`[SYNC] ${key}: sin cambios (etag/count igual)`);
    return;
  }

  const last = local?.lastUpdatedAt ?? null;
  const cached = local?.value ?? [];

  if (!last) {
    await forceReplaceResource<T>(key, remoteMeta, log);
    return;
  }

  log(`[SYNC] ${key}: cambios detectados → intentando delta desde ${last}`);

  try {
    const res = await api.get<DeltaResponse<T>>(`/sync/${key}`, {
      params: { since: last },
      validateStatus: (s: number) => s >= 200 && s < 300,
    } as any);

    const merged = mergeById(
      cached as any,
      (res.data.items ?? []) as any,
      res.data.deletedIds ?? []
    );

    const remoteCount = remoteMeta.count ?? 0;
    const mergedCount = merged.length ?? 0;

    if (mergedCount !== remoteCount) {
      log(
        `[SYNC] ${key}: inconsistencia detectada (local=${mergedCount}, remoto=${remoteCount}) → reseed completo`
      );
      await forceReplaceResource<T>(key, remoteMeta, log);
      return;
    }

    await saveResourceSnapshot(key, merged, {
      etag: remoteMeta.etag,
      lastUpdatedAt: res.data.lastUpdatedAt ?? remoteMeta.lastUpdatedAt ?? last,
    });

    log(`[SYNC] ${key}: delta aplicado correctamente (cache=${merged.length})`);
  } catch (err: any) {
    log(`[SYNC] ${key}: error en delta → reseed completo`, err?.message ?? err);
    await forceReplaceResource<T>(key, remoteMeta, log);
  }
}
