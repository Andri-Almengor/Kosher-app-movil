import type { Lang } from "@/i18n/I18nProvider";
import type { Restaurant } from "@/features/restaurants/api/restaurantsApi";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const next = clean(value);
    if (next) return next;
  }
  return "";
}

function pickLocalized(
  lang: Lang,
  es?: string | null,
  en?: string | null,
  plain?: string | null
): string {
  const esValue = clean(es);
  const enValue = clean(en);
  const plainValue = clean(plain);

  if (lang === "en") return enValue || esValue || plainValue;
  return esValue || enValue || plainValue;
}

export type LocalizedRestaurant<T extends Partial<Restaurant> = Restaurant> = T & {
  __localizedLang: Lang;
  nombre: string;
  tipo: string;
  ubicacion: string;
  acercaDe: string;
  horario: string;
  contacto: string;
  telefonoDescripcion: string;
  whatsappDescripcion: string;
  correoDescripcion: string;
  direccion: string;
};

export function localizeRestaurant<T extends Partial<Restaurant>>(
  item: T,
  lang: Lang = "es"
): LocalizedRestaurant<T> {
  return {
    ...item,
    __localizedLang: lang,
    nombre: pickLocalized(lang, item.nombreEs, item.nombreEn, item.nombre),
    tipo: pickLocalized(lang, item.tipoEs, item.tipoEn, item.tipo),
    ubicacion: pickLocalized(lang, item.ubicacionEs, item.ubicacionEn, item.ubicacion),
    acercaDe: pickLocalized(lang, item.acercaDeEs, item.acercaDeEn, item.acercaDe),
    horario: pickLocalized(lang, item.horarioEs, item.horarioEn, item.horario),
    contacto: pickLocalized(lang, item.contactoEs, item.contactoEn, item.contacto),
    telefonoDescripcion: pickLocalized(lang, item.descripTelefonoEs, item.descripTelefonoEn, item.telefonoDescripcion),
    whatsappDescripcion: pickLocalized(lang, item.descripWhatsappEs, item.descripWhatsappEn, item.whatsappDescripcion),
    correoDescripcion: pickLocalized(lang, item.descripCorreoEs, item.descripCorreoEn, item.correoDescripcion),
    direccion: pickLocalized(lang, item.direccionEs, item.direccionEn, item.direccion),
  };
}

export function localizeRestaurantName(
  item:
    | Pick<Restaurant, "nombre" | "nombreEs" | "nombreEn">
    | null
    | undefined,
  lang: Lang = "es"
): string {
  return pickLocalized(lang, item?.nombreEs, item?.nombreEn, item?.nombre);
}

export function restaurantHasBilingualFields(
  item: Partial<Restaurant> | null | undefined
): boolean {
  if (!item) return false;

  return [
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
  ].some((value) => firstNonEmpty(value).length > 0);
}