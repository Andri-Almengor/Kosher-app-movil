// src/lib/offline/sync.ts
// Sincroniza y guarda en caché los datos clave para uso offline.

import { CacheKeys, saveCache, readCache, readString, saveString } from "./cache";
import { api } from "@/lib/api/client";
import { ProductRepository } from "@/features/products/data/ProductRepository";
import { getNoticias } from "@/features/news/newsApi";
import { listEvents } from "@/features/calendar/api/calendarApi";
import { cacheProductLikeImages } from "./imageCache";
import { notifyForNewNewsItems } from "@/lib/notifications/newsNotifications";

export type SyncManifest = {
  generatedAt: string;
  productos: { etag: string; lastUpdatedAt: string | null; count: number };
  noticias: { etag: string; lastUpdatedAt: string | null; count: number };
  eventos: { etag: string; lastUpdatedAt: string | null; count: number };
};

async function getRemoteManifest(): Promise<{ manifest?: SyncManifest; notModified: boolean }> {
  const prevEtag = await readString(CacheKeys.manifestEtag);
  const res = await api.get<SyncManifest>("/sync/manifest", {
    headers: prevEtag ? { "If-None-Match": prevEtag } : undefined,
    validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
  });

  if (res.status === 304) {
    const cached = await readCache<SyncManifest>(CacheKeys.manifest);
    return { manifest: cached?.value ?? undefined, notModified: true };
  }

  const manifest = res.data;
  const etag = (res.headers as any)?.etag as string | undefined;
  if (etag) {
    try { await saveString(CacheKeys.manifestEtag, etag); } catch {}
  }
  try { await saveCache(CacheKeys.manifest, manifest); } catch {}
  return { manifest, notModified: false };
}

export type SyncResult = {
  ok: boolean;
  products?: number;
  noticias?: number;
  events?: number;
  error?: string;
};

export async function syncProducts(): Promise<number> {
  // Forzamos remoto usando el método interno (si existe) o llamando al datasource.
  const products = await ProductRepository.list({ forceRemote: true } as any);

  // Cachea imágenes para verlas offline (campos usados por tu UI)
  const productsWithLocalImages = await cacheProductLikeImages(products as any, [
    "imgProd",
    "logoSello",
    "logoGf",
    "imageUrl",
  ]);

  await saveCache(CacheKeys.products, productsWithLocalImages as any);
  return (productsWithLocalImages as any[]).length;
}

export async function syncNoticias(): Promise<number> {
  const previousNoticias = (await readCache<any[]>(CacheKeys.noticias))?.value ?? [];
  const noticias = await getNoticias({ forceRemote: true } as any);
  await saveCache(CacheKeys.noticias, noticias);
  try {
    await notifyForNewNewsItems(noticias as any, {});
  } catch {}
  return noticias.length;
}

export async function syncEvents(): Promise<number> {
  const events = await listEvents(undefined, { forceRemote: true } as any);
  await saveCache(CacheKeys.events, events);
  return events.length;
}

export async function syncAll(): Promise<SyncResult> {
  try {
    // IMPORTANTE:
    // Leemos el manifest anterior ANTES de pedir el remoto, porque getRemoteManifest()
    // guarda el nuevo manifest en caché. Si lo leemos después, siempre sería "igual"
    // y nunca descargaríamos nada.
    const prev = (await readCache<SyncManifest>(CacheKeys.manifest))?.value;

    const remote = await getRemoteManifest();
    const manifest = remote.manifest;

    // Si no pudimos obtener manifest, hacemos best-effort normal.
    if (!manifest) {
      const [products, noticias, events] = await Promise.all([
        syncProducts().catch(() => 0),
        syncNoticias().catch(() => 0),
        syncEvents().catch(() => 0),
      ]);
      return { ok: true, products, noticias, events };
    }

    // Si el manifest no cambió pero NO hay cache local (primera instalación / storage limpio),
    // forzamos sync para evitar quedar en blanco offline.
    const cachedProductsCount = (await readCache<any[]>(CacheKeys.products))?.value?.length ?? 0;
    const cachedNoticiasCount = (await readCache<any[]>(CacheKeys.noticias))?.value?.length ?? 0;
    const cachedEventsCount = (await readCache<any[]>(CacheKeys.events))?.value?.length ?? 0;

    const productosChanged = !prev || prev.productos?.etag !== manifest.productos.etag || cachedProductsCount === 0;
    const noticiasChanged = !prev || prev.noticias?.etag !== manifest.noticias.etag || cachedNoticiasCount === 0;
    const eventosChanged = !prev || prev.eventos?.etag !== manifest.eventos.etag || cachedEventsCount === 0;

    const [products, noticias, events] = await Promise.all([
      productosChanged ? syncProducts().catch(() => 0) : Promise.resolve(0),
      noticiasChanged ? syncNoticias().catch(() => 0) : Promise.resolve(0),
      eventosChanged ? syncEvents().catch(() => 0) : Promise.resolve(0),
    ]);

    // Guardamos el manifest actual como "último conocido"
    try {
      await saveCache(CacheKeys.manifest, manifest);
    } catch {}

    return { ok: true, products, noticias, events };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

