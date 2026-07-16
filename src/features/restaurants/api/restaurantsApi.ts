import { api } from "@/lib/api/client";
import { restaurantHasBilingualFields } from "@/features/restaurants/utils/localizeRestaurant";

export type Restaurant = {
  id: number;
  imageUrl?: string | null;
  nombre?: string | null;
  tipo?: string | null;
  ubicacion?: string | null;
  acercaDe?: string | null;
  horario?: string | null;
  contacto?: string | null;
  telefono?: string | null;
  telefonoRaw?: string | null;
  telefonoDescripcion?: string | null;
  descripTelefonoEs?: string | null;
  descripTelefonoEn?: string | null;
  whatsapp?: string | null;
  whatsappRaw?: string | null;
  whatsappDescripcion?: string | null;
  descripWhatsappEs?: string | null;
  descripWhatsappEn?: string | null;
  correo?: string | null;
  correoRaw?: string | null;
  correoDescripcion?: string | null;
  descripCorreoEs?: string | null;
  descripCorreoEn?: string | null;
  direccion?: string | null;
  direccionLink?: string | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
  nombreEs?: string | null;
  nombreEn?: string | null;
  tipoEs?: string | null;
  tipoEn?: string | null;
  ubicacionEs?: string | null;
  ubicacionEn?: string | null;
  acercaDeEs?: string | null;
  acercaDeEn?: string | null;
  horarioEs?: string | null;
  horarioEn?: string | null;
  contactoEs?: string | null;
  contactoEn?: string | null;
  direccionEs?: string | null;
  direccionEn?: string | null;
  activo?: boolean;
};

export async function getRestaurants(params?: { q?: string; tipo?: string; lang?: "es" | "en" }) {
  const { data } = await api.get<Restaurant[]>("/restaurantes", { params });
  return data;
}

export async function getRestaurantById(id: number, lang?: "es" | "en") {
  const { data } = await api.get<Restaurant>(`/restaurantes/${id}`, { params: lang ? { lang } : undefined });
  return data;
}


export function validateRestaurantPayloadShape(items: Restaurant[] | Restaurant | null | undefined) {
  const list = Array.isArray(items) ? items : items ? [items] : [];
  return {
    total: list.length,
    bilingualItems: list.filter((item) => restaurantHasBilingualFields(item)).length,
  };
}
