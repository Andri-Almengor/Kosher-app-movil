import type { Producto } from "@/types/producto";
import type { Lang } from "@/i18n/I18nProvider";

const pick = (es?: string | null, en?: string | null, lang: Lang = "es") => {
  if (lang === "en") return (en?.trim() || es?.trim() || "").trim();
  return (es?.trim() || en?.trim() || "").trim();
};

export function localizeProduct<T extends Partial<Producto>>(item: T, lang: Lang = "es") {
  return {
    ...item,
    __localizedLang: lang,
    catGeneral: pick(item.catGeneral, item.catGeneralEn, lang),
    categoria1: pick(item.categoria1, item.categoria1En, lang),
    fabricanteMarca: pick(item.fabricanteMarca, item.fabricanteMarcaEn, lang),
    nombre: pick(item.nombre, item.nombreEn, lang),
    certifica: pick(item.certifica, item.certificaEn, lang) || null,
    sello: pick(item.sello, item.selloEn, lang) || null,
    atributo1: pick(item.atributo1, item.atributo1En, lang) || null,
    atributo2: pick(item.atributo2, item.atributo2En, lang) || null,
    atributo3: pick(item.atributo3, item.atributo3En, lang) || null,
    tienda: pick(item.tienda, item.tiendaEn, lang) || null,
  };
}
