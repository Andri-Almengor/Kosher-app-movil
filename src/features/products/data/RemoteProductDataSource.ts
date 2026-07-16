// src/features/products/data/RemoteProductDataSource.ts
import { api } from "../../../lib/api/client";
import { Product } from "../api/types";

type BackendProducto = {
  id: number;
  // Legacy
  categoria?: string;
  marca?: string;
  detalle?: string | null;
  imgProd?: string | null;
  sello?: string | null;
  certifica?: string | null;
  pol?: string | null;
  logoSello?: string | null;
  gf?: string | null;
  logoGf?: string | null;
  tienda?: string | null;
  pesaj?: string | null;

  // Esquema v2 (backend actualizado)
  catGeneral?: string;
  categoria1?: string;
  fabricanteMarca?: string;
  nombre?: string;
  atributo1?: string | null;
  atributo2?: string | null;
  atributo3?: string | null;
  fotoProducto?: string | null;
  fotoSello1?: string | null;
  fotoSello2?: string | null;
};

type PagedBackendResponse = {
  items: BackendProducto[];
  total: number;
  page: number;
  pageSize: number;
};

function mapProducto(p: BackendProducto): Product {
  const categoria = p.categoria ?? p.catGeneral ?? p.categoria1 ?? "";
  const marca = p.marca ?? p.fabricanteMarca ?? "";
  const detalle = (p.detalle ?? p.nombre ?? "") as string;

  const imgProd = p.imgProd ?? p.fotoProducto ?? null;
  const logoSello = p.logoSello ?? p.fotoSello1 ?? p.fotoSello2 ?? null;

  return {
    id: String(p.id),
    categoria,
    marca,
    detalle,

    imgProd,
    logoSello,

    sello: p.sello ?? null,
    certifica: p.certifica ?? null,
    pol: p.pol ?? null,

    // Nota: el esquema v2 no tiene gf/logoGf/pesaj por defecto.
    gf: p.gf ?? null,
    logoGf: p.logoGf ?? null,
    tienda: p.tienda ?? null,
    pesaj: p.pesaj ?? null,
  };
}

export const RemoteProductDataSource = {
  async list(): Promise<Product[]> {
    const { data } = await api.get<BackendProducto[]>("/productos");
    return (data ?? []).map(mapProducto);
  },

  async listWithMeta(prevEtag?: string): Promise<{
    items: Product[];
    etag?: string;
    notModified?: boolean;
  }> {
    try {
      const res = await api.get<BackendProducto[]>("/productos", {
        headers: prevEtag ? { "If-None-Match": prevEtag } : undefined,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
      });

      if (res.status === 304) {
        return { items: [], etag: prevEtag, notModified: true };
      }

      const etag = typeof res.headers?.etag === "string" ? res.headers.etag : undefined;
      return { items: (res.data ?? []).map(mapProducto), etag, notModified: false };
    } catch {
      const items = await this.list();
      return { items, notModified: false };
    }
  },

  async getById(id: string): Promise<Product> {
    const { data } = await api.get<BackendProducto>(`/productos/${id}`);
    return mapProducto(data);
  },

  async listPaged(page = 1, pageSize = 50): Promise<{
    items: Product[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { data } = await api.get<PagedBackendResponse>("/productos/paged", {
      params: { page, pageSize },
    });

    return {
      items: data.items.map(mapProducto),
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
    };
  },
};
