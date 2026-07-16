// src/features/products/data/ProductRepository.ts
import { Product } from "../api/types";
import { RemoteProductDataSource } from "./RemoteProductDataSource";
import { CacheKeys, readCache, saveCache, readString, saveString } from "@/lib/offline/cache";
import { cacheProductLikeImages } from "@/lib/offline/imageCache";

type ListOptions = {
  /** Si es true: intenta SIEMPRE remoto y no lee caché antes. */
  forceRemote?: boolean;
  /** Si es true: devuelve caché primero si existe (y luego el caller puede refrescar). */
  preferCache?: boolean;
};

let lastRemoteFailAt = 0;
const REMOTE_COOLDOWN_MS = 30_000;

export const ProductRepository = {
  async list(opts?: ListOptions): Promise<Product[]> {
    const now = Date.now();

    // Si recientemente falló remoto, evitamos reintentar cada 4s cuando el usuario está offline.
    if (!opts?.forceRemote && lastRemoteFailAt && now - lastRemoteFailAt < REMOTE_COOLDOWN_MS) {
      const cached = await readCache<Product[]>(CacheKeys.products);
      if (cached?.value?.length) return cached.value;
      // si no hay cache, seguimos al remoto (por si vuelve la red)
    }

    // 1) Cache-first (opcional)
    if (opts?.preferCache && !opts?.forceRemote) {
      const cached = await readCache<Product[]>(CacheKeys.products);
      if (cached?.value?.length) return cached.value;
    }

    // 2) Intento remoto
    try {
      const prevEtag = await readString(CacheKeys.productsEtag);
      const res = await RemoteProductDataSource.listWithMeta(prevEtag ?? undefined);

      // Si el backend dice "no cambió", devolvemos cache sin re-descargar
      if (res.notModified) {
        const cached = await readCache<Product[]>(CacheKeys.products);
        if (cached?.value?.length) return cached.value;
        // si no hay cache, hacemos un fetch completo
        const fresh = await RemoteProductDataSource.list();
        try {
          await saveCache(CacheKeys.products, fresh);
        } catch (e) {}
        return fresh;
      }

      const fresh = res.items;

      // guardamos etag + cache para offline
      try {
        if (res.etag) await saveString(CacheKeys.productsEtag, res.etag);
        // Guardamos primero el JSON (rápido)
        await saveCache(CacheKeys.products, fresh);

        // Luego cacheamos imágenes (puede tardar) y re-guardamos con URIs locales.
        // Fire-and-forget para no bloquear la UI.
        void (async () => {
          try {
            const withLocal = await cacheProductLikeImages(fresh as any, [
              "imgProd",
              "logoSello",
              "logoGf",
              "imageUrl",
            ]);
            await saveCache(CacheKeys.products, withLocal as any);
          } catch {}
        })();
      } catch (e) {
        console.log("[OFFLINE] no se pudo guardar cache productos", e);
      }
      return fresh;
    } catch (e) {
      lastRemoteFailAt = Date.now();
      // 3) Fallback a caché
      const cached = await readCache<Product[]>(CacheKeys.products);
      if (cached?.value?.length) {
        console.log(`[OFFLINE] usando productos cache (savedAt=${cached.savedAt})`);
        return cached.value;
      }
      throw e;
    }
  },

  async getById(id: string): Promise<Product | undefined> {
    // Si el id está vacío o es un id "local-..." que no existe en la BD,
    // no llamamos al backend y devolvemos undefined.
    if (!id) return undefined;
    if (id.startsWith("local-")) return undefined;

    // Solo llamamos al backend si el id es numérico
    if (!/^\d+$/.test(id)) return undefined;

    // 1) intenta remoto
    try {
      const product = await RemoteProductDataSource.getById(id);
      return product;
    } catch (e) {
      // 2) fallback: buscar en caché de lista
      const cached = await readCache<Product[]>(CacheKeys.products);
      const found = cached?.value?.find((p) => String(p.id) === String(id));
      if (found) {
        console.log(`[OFFLINE] getById usando cache id=${id}`);
        return found;
      }
      throw e;
    }
  },

  async listPaged(page = 1, pageSize = 50) {
    return RemoteProductDataSource.listPaged(page, pageSize);
  },
};
