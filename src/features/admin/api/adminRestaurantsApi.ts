import { api, putWithPatchFallback } from "@/lib/api/client";
import { refreshResourceIfOnline, loadCachedRestaurantes } from "@/offline/sync";
import { saveResourceSnapshot } from "@/offline/sqliteStore";

export type AdminRestaurant = {
  id: number;
  imageUrl?: string | null;
  nombreEs: string;
  nombreEn?: string | null;
  tipoEs: string;
  tipoEn?: string | null;
  ubicacionEs?: string | null;
  ubicacionEn?: string | null;
  acercaDeEs?: string | null;
  acercaDeEn?: string | null;
  horarioEs?: string | null;
  horarioEn?: string | null;
  telefono?: string | null;
  telefonoRaw?: string | null;
  descripTelefonoEs?: string | null;
  descripTelefonoEn?: string | null;
  whatsapp?: string | null;
  whatsappRaw?: string | null;
  descripWhatsappEs?: string | null;
  descripWhatsappEn?: string | null;
  correo?: string | null;
  correoRaw?: string | null;
  descripCorreoEs?: string | null;
  descripCorreoEn?: string | null;
  contactoEs?: string | null;
  contactoEn?: string | null;
  direccionEs?: string | null;
  direccionEn?: string | null;
  direccionLink?: string | null;
  activo?: boolean;
  creadoEn?: string;
};

export type AdminRestaurantOption = { id: number; nombreEs: string; nombreEn?: string | null };


async function refreshPublicCacheAfterAdminWrite() {
  try {
    await refreshResourceIfOnline("restaurantes", () => {});
  } catch {
    // No bloquea el guardado del admin si el refresco offline falla.
  }
}

export async function listRestaurants() {
  const cached = await loadCachedRestaurantes<AdminRestaurant>().catch(() => []);
  const remote = api.get<AdminRestaurant[]>("/admin/restaurantes").then(async ({ data }) => {
    await saveResourceSnapshot("restaurantes", data as any, { lastUpdatedAt: new Date().toISOString() }).catch(() => {});
    return data;
  });

  if (cached.length) {
    remote.catch(() => {});
    return await Promise.race([
      remote,
      new Promise<AdminRestaurant[]>((resolve) => setTimeout(() => resolve(cached), 350)),
    ]);
  }

  return remote;
}

export async function listRestaurantOptions() {
  const { data } = await api.get<{ nombres: AdminRestaurantOption[]; tipos: AdminRestaurantOption[] }>("/admin/restaurantes/options");
  return data;
}

export async function createRestaurant(payload: Omit<AdminRestaurant, 'id'>) {
  const { data } = await api.post<AdminRestaurant>("/admin/restaurantes", payload);
  await refreshPublicCacheAfterAdminWrite();
  return data;
}

export async function updateRestaurant(id: number, payload: Partial<AdminRestaurant>) {
  const data = await putWithPatchFallback<AdminRestaurant>(`/admin/restaurantes/${id}`, payload);
  await refreshPublicCacheAfterAdminWrite();
  return data;
}

export async function deleteRestaurant(id: number) {
  const { data } = await api.delete(`/admin/restaurantes/${id}`);
  await refreshPublicCacheAfterAdminWrite();
  return data;
}

export async function createRestaurantNameOption(payload: { nombreEs: string; nombreEn?: string | null }) {
  const { data } = await api.post("/admin/restaurantes/options/nombres", payload);
  return data;
}

export async function createRestaurantTypeOption(payload: { nombreEs: string; nombreEn?: string | null }) {
  const { data } = await api.post("/admin/restaurantes/options/tipos", payload);
  return data;
}
