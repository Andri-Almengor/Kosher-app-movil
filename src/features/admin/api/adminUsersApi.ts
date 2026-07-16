import { api, putWithPatchFallback } from "@/lib/api/client";

export type AdminUserRow = {
  id: number;
  nombre: string;
  email: string;
  rol?: string | null;
};

export async function listAdminUsers() {
  const { data } = await api.get<AdminUserRow[]>("/admin/usuarios");
  return data;
}

export async function createAdminUser(payload: {
  nombre: string;
  email: string;
  password: string;
}) {
  const { data } = await api.post("/admin/usuarios", payload);
  return data;
}

export async function updateAdminUser(
  id: number,
  payload: { nombre?: string; email?: string; password?: string }
) {
  return putWithPatchFallback(`/admin/usuarios/${id}`, payload);
}

export async function deleteAdminUser(id: number) {
  const { data } = await api.delete(`/admin/usuarios/${id}`);
  return data;
}
