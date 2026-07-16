// src/features/news/newsApi.ts
import { api } from "@/lib/api/client";
import { CacheKeys, readCache, saveCache, readString, saveString } from "@/lib/offline/cache";

export type Noticia = {
  id: number;
  titulo: string;
  contenido?: string | null;
  imageUrl?: string | null;
  fileUrl?: string | null;
  creadoEn: string;
  actualizadoEn: string;
  destino?: "NOVEDADES" | "ANUNCIANTES";
  activo?: boolean;
  notifyUsers?: boolean;
  restauranteId?: number | null;
  restaurante?: { id: number; nombreEs?: string | null; nombreEn?: string | null; imageUrl?: string | null } | null;
};

// Obtener todas las noticias (uso público y admin)
export async function getNoticias(opts?: { forceRemote?: boolean; preferCache?: boolean }): Promise<
  Noticia[]
> {
  if (opts?.preferCache && !opts?.forceRemote) {
    const cached = await readCache<Noticia[]>(CacheKeys.noticias);
    if (cached?.value?.length) return cached.value;
  }

  try {
    const prevEtag = await readString(CacheKeys.noticiasEtag);
    const res = await api.get<Noticia[]>("/noticias", {
      headers: prevEtag ? { "If-None-Match": prevEtag } : undefined,
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    });

    if (res.status === 304) {
      const cached = await readCache<Noticia[]>(CacheKeys.noticias);
      if (cached?.value?.length) return cached.value;
      // si no hay cache, seguimos como si fuera primer sync
    }

    const data = res.data ?? [];
    const etag = (res.headers as any)?.etag as string | undefined;
    if (etag) {
      try { await saveString(CacheKeys.noticiasEtag, etag); } catch {}
    }
    try {
      await saveCache(CacheKeys.noticias, data ?? []);
    } catch (e) {
      console.log("[OFFLINE] no se pudo guardar cache noticias", e);
    }
    return data;
  } catch (e) {
    const cached = await readCache<Noticia[]>(CacheKeys.noticias);
    if (cached?.value?.length) {
      console.log(`[OFFLINE] usando noticias cache (savedAt=${cached.savedAt})`);
      return cached.value;
    }
    throw e;
  }
}

// Crear noticia (solo admin, requiere token configurado en api client)
export async function crearNoticia(input: {
  titulo: string;
  contenido?: string;
  imageUrl?: string;
  fileUrl?: string;
}): Promise<Noticia> {
  const { data } = await api.post<Noticia>("/admin/noticias", input);
  return data;
}

// Actualizar noticia
export async function actualizarNoticia(
  id: number,
  input: {
    titulo: string;
    contenido?: string;
    imageUrl?: string;
    fileUrl?: string;
  }
): Promise<Noticia> {
  const { data } = await api.put<Noticia>(`/admin/noticias/${id}`, input);
  return data;
}

// Eliminar noticia
export async function eliminarNoticia(id: number): Promise<void> {
  await api.delete(`/admin/noticias/${id}`);
}
