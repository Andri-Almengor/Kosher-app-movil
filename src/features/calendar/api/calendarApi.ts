import { api, putWithPatchFallback } from "@/lib/api/client";
import { CacheKeys, readCache, saveCache, readString, saveString } from "@/lib/offline/cache";

export type CalendarEvent = {
  id: number;
  titulo: string;
  descripcion?: string | null;
  ubicacion?: string | null;
  inicio: string;
  fin?: string | null;
  todoElDia: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
  creadoPorId?: number | null;
};

export async function listEvents(
  params?: { from?: string; to?: string },
  opts?: { forceRemote?: boolean; preferCache?: boolean }
) {
  // Para eventos, el cache aplica solo si no hay filtros de rango.
  const canUseCache = !params?.from && !params?.to;

  if (canUseCache && opts?.preferCache && !opts?.forceRemote) {
    const cached = await readCache<CalendarEvent[]>(CacheKeys.events);
    if (cached?.value?.length) return cached.value;
  }

  try {
    const prevEtag = canUseCache ? await readString(CacheKeys.eventsEtag) : null;
    const res = await api.get<CalendarEvent[]>("/events", {
      params,
      headers: canUseCache && prevEtag ? { "If-None-Match": prevEtag } : undefined,
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    });

    if (canUseCache && res.status === 304) {
      const cached = await readCache<CalendarEvent[]>(CacheKeys.events);
      if (cached?.value?.length) return cached.value;
    }

    const etag = (res.headers as any)?.etag as string | undefined;
    if (canUseCache && etag) {
      try { await saveString(CacheKeys.eventsEtag, etag); } catch {}
    }
    if (canUseCache) {
      try {
        await saveCache(CacheKeys.events, res.data ?? []);
      } catch (e) {
        console.log("[OFFLINE] no se pudo guardar cache events", e);
      }
    }
    return res.data;
  } catch (e) {
    if (canUseCache) {
      const cached = await readCache<CalendarEvent[]>(CacheKeys.events);
      if (cached?.value?.length) {
        console.log(`[OFFLINE] usando events cache (savedAt=${cached.savedAt})`);
        return cached.value;
      }
    }
    throw e;
  }
}

export async function createEventAdmin(payload: {
  titulo: string;
  descripcion?: string | null;
  ubicacion?: string | null;
  inicio: string;
  fin?: string | null;
  todoElDia?: boolean;
}) {
  const res = await api.post<CalendarEvent>("/events/admin", payload);
  return res.data;
}

export async function updateEventAdmin(
  id: number,
  payload: {
    titulo?: string;
    descripcion?: string | null;
    ubicacion?: string | null;
    inicio?: string;
    fin?: string | null;
    todoElDia?: boolean;
  }
) {
  return putWithPatchFallback<CalendarEvent>(`/events/admin/${id}`, payload);
}

export async function deleteEventAdmin(id: number) {
  const res = await api.delete<{ ok: boolean }>(`/events/admin/${id}`);
  return res.data;
}
