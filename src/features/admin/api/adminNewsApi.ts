import { api, putWithPatchFallback } from "@/lib/api/client";
import { refreshResourceIfOnline, loadCachedNoticias } from "@/offline/sync";
import { saveResourceSnapshot } from "@/offline/sqliteStore";

export type AdminNews = {
  id: number;
  titulo?: string | null;
  contenido?: string | null;
  imageUrl?: string | null;
  fileUrl?: string | null;
  destino?: "NOVEDADES" | "ANUNCIANTES";
  activo?: boolean;
  notifyUsers?: boolean;
  restauranteId?: number | null;
  restaurante?: { id: number; nombreEs?: string | null; nombreEn?: string | null; imageUrl?: string | null } | null;
  creadoEn?: string;
};


async function refreshPublicCacheAfterAdminWrite() {
  try {
    await refreshResourceIfOnline("noticias", () => {});
  } catch {
    // No bloquea el guardado del admin si el refresco offline falla.
  }
}

export async function listNews() {
  const cached = await loadCachedNoticias<AdminNews>().catch(() => []);
  const remote = api.get<AdminNews[]>("/admin/noticias").then(async ({ data }) => {
    await saveResourceSnapshot("noticias", data as any, { lastUpdatedAt: new Date().toISOString() }).catch(() => {});
    return data;
  });

  if (cached.length) {
    remote.catch(() => {});
    return await Promise.race([
      remote,
      new Promise<AdminNews[]>((resolve) => setTimeout(() => resolve(cached), 350)),
    ]);
  }

  return remote;
}

export async function createNews(payload: {
  titulo?: string | null;
  contenido?: string | null;
  imageUrl?: string | null;
  fileUrl?: string | null;
  destino?: "NOVEDADES" | "ANUNCIANTES";
  activo?: boolean;
  notifyUsers?: boolean;
  restauranteId?: number | null;
}) {
  const { data } = await api.post("/admin/noticias", payload);
  await refreshPublicCacheAfterAdminWrite();
  return data;
}

export async function updateNews(
  id: number,
  payload: {
    titulo?: string | null;
    contenido?: string | null;
    imageUrl?: string | null;
    fileUrl?: string | null;
    destino?: "NOVEDADES" | "ANUNCIANTES";
    activo?: boolean;
  notifyUsers?: boolean;
    restauranteId?: number | null;
  }
) {
  const data = await putWithPatchFallback(`/admin/noticias/${id}`, payload);
  await refreshPublicCacheAfterAdminWrite();
  return data;
}

export async function deleteNews(id: number) {
  const { data } = await api.delete(`/admin/noticias/${id}`);
  await refreshPublicCacheAfterAdminWrite();
  return data;
}
