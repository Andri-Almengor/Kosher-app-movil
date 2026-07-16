// src/features/products/data/ProductFilters.ts
import type { Product } from "../api/types";

export type ProductFilters = {
  categoria?: string; // solo la usamos como valor de UI
  marca?: string;
  tienda?: string;
  gf?: string;
  search?: string;
};

const norm = (value?: string | null) =>
  (value ?? "").toString().toLowerCase().trim();

export const ProductFilterUtils = {
  applyFilters(products: Product[], filters: ProductFilters): Product[] {
    return products.filter((p) => {
      const nMarca = norm(p.marca);
      const nDetalle = norm(p.detalle);
      const nTienda = norm(p.tienda);
      const nCategoria = norm(p.categoria);
      const nGf = norm(p.gf);

      // ───── BÚSQUEDA LIBRE ─────
      if (filters.search && filters.search.trim() !== "") {
        const s = norm(filters.search);

        const coincideSearch =
          nMarca.includes(s) ||
          nDetalle.includes(s) ||
          nTienda.includes(s) ||
          nCategoria.includes(s) ||
          nGf.includes(s);

        if (!coincideSearch) return false;
      }

      // ───── MARCA ─────
      if (filters.marca && filters.marca.trim() !== "") {
        if (nMarca !== norm(filters.marca)) return false;
      }

      // ───── TIENDA ─────
      if (filters.tienda && filters.tienda.trim() !== "") {
        if (nTienda !== norm(filters.tienda)) return false;
      }

      // ───── GF ─────
      if (filters.gf && filters.gf.trim() !== "") {
        if (nGf !== norm(filters.gf)) return false;
      }

      return true;
    });
  },

  extractOptions(products: Product[]) {
    const categorias = Array.from(
      new Set(
        products
          .map((p) => p.detalle) // mostramos detalle como "categoría"
          .filter((v): v is string => !!v && v.trim() !== "")
      )
    );

    const marcas = Array.from(
      new Set(
        products
          .map((p) => p.marca)
          .filter((v): v is string => !!v && v.trim() !== "")
      )
    );

    const tiendas = Array.from(
      new Set(
        products
          .map((p) => p.tienda)
          .filter((v): v is string => !!v && v.trim() !== "")
      )
    );

    const gfs = Array.from(
      new Set(
        products
          .map((p) => p.gf)
          .filter((v): v is string => !!v && v.trim() !== "")
      )
    );

    return { categorias, marcas, tiendas, gfs };
  },
};
