import { loadCachedNoticias, loadCachedProductos, loadCachedRestaurantes } from '@/offline/sync';
import { translateText } from './translateText';

function uniqueStrings(values: Array<string | null | undefined>) {
  const out = new Set<string>();
  for (const raw of values) {
    const v = String(raw ?? '').trim();
    if (!v) continue;
    if (v.length > 220) continue;
    out.add(v);
  }
  return Array.from(out);
}

export async function warmOfflineTranslations(targetLang: 'es' | 'en') {
  if (targetLang !== 'en') return { ok: true, total: 0 };

  const [products, noticias, restaurantes] = await Promise.all([
    loadCachedProductos<any>(),
    loadCachedNoticias<any>(),
    loadCachedRestaurantes<any>(),
  ]);

  const candidates = uniqueStrings([
    ...products.flatMap((item: any) => [
      item?.catGeneral,
      item?.categoria1,
      item?.categoria,
      item?.fabricanteMarca,
      item?.marca,
      item?.detalle,
      item?.sello,
      item?.certifica,
      item?.gf,
      item?.tienda,
      item?.atributo1,
      item?.atributo2,
      item?.atributo3,
      item?.pol,
    ]),
    ...noticias.flatMap((item: any) => [
      item?.titulo,
      item?.contenido,
      item?.destino,
      item?.descripcion,
    ]),
    ...restaurantes.flatMap((item: any) => [
      item?.nombre,
      item?.nombreEs,
      item?.nombreEn,
      item?.tipoComercio,
      item?.tipoComercioEs,
      item?.tipoComercioEn,
      item?.ubicacion,
      item?.ubicacionEs,
      item?.ubicacionEn,
      item?.horario,
      item?.horarioEs,
      item?.horarioEn,
      item?.contacto,
      item?.contactoEs,
      item?.contactoEn,
      item?.descripcion,
      item?.descripcionEs,
      item?.descripcionEn,
    ]),
  ]);

  for (const text of candidates) {
    try {
      await translateText(text, targetLang);
    } catch {
      // ignore, best effort
    }
  }

  return { ok: true, total: candidates.length };
}
