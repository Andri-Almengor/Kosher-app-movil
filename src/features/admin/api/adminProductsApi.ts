import { api, putWithPatchFallback } from "@/lib/api/client";
import { refreshResourceIfOnline, loadCachedProductos } from "@/offline/sync";
import { saveResourceSnapshot } from "@/offline/sqliteStore";

export type AdminProduct = {
  id: number;
  catGeneral: string;
  catGeneralEn?: string | null;
  categoria1: string;
  categoria1En?: string | null;
  fabricanteMarca: string;
  fabricanteMarcaEn?: string | null;
  nombre: string;
  nombreEn?: string | null;

  certifica?: string | null;
  certificaEn?: string | null;
  sello?: string | null;
  selloEn?: string | null;

  atributo1?: string | null;
  atributo1En?: string | null;
  atributo2?: string | null;
  atributo2En?: string | null;
  atributo3?: string | null;
  atributo3En?: string | null;

  tienda?: string | null;
  tiendaEn?: string | null;

  fotoProducto?: string | null;
  fotoSello1?: string | null;
  fotoSello2?: string | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
};

export type ProductSealOption = {
  id?: string;
  nombreEs?: string | null;
  nombreEn?: string | null;
  valueEs?: string | null;
  valueEn?: string | null;
  imageUrl: string;
};


async function refreshPublicCacheAfterAdminWrite() {
  try {
    await refreshResourceIfOnline("productos", () => {});
  } catch {
    // No bloquea el guardado del admin si el refresco offline falla.
  }
}


export async function listAdminProductSeals() {
  const { data } = await api.get<ProductSealOption[]>("/admin/productos/sellos");
  return data;
}

export async function createAdminProductSeal(payload: { nombreEs?: string | null; nombreEn?: string | null; imageUrl: string }) {
  const { data } = await api.post<ProductSealOption>("/admin/productos/sellos", payload);
  return data;
}

export async function listAdminProducts() {
  const cached = await loadCachedProductos<AdminProduct>().catch(() => []);
  const remote = api.get<AdminProduct[]>("/admin/productos").then(async ({ data }) => {
    await saveResourceSnapshot("productos", data as any, { lastUpdatedAt: new Date().toISOString() }).catch(() => {});
    return data;
  });

  if (cached.length) {
    remote.catch(() => {});
    return await Promise.race([
      remote,
      new Promise<AdminProduct[]>((resolve) => setTimeout(() => resolve(cached), 350)),
    ]);
  }

  return remote;
}

export async function createAdminProduct(payload: Omit<AdminProduct, "id">) {
  const { data } = await api.post<AdminProduct>("/admin/productos", payload);
  await refreshPublicCacheAfterAdminWrite();
  return data;
}

export async function updateAdminProduct(id: number, payload: Partial<Omit<AdminProduct, "id">>) {
  const data = await putWithPatchFallback<AdminProduct>(`/admin/productos/${id}`, payload);
  await refreshPublicCacheAfterAdminWrite();
  return data;
}

export async function deleteAdminProduct(id: number) {
  const { data } = await api.delete(`/admin/productos/${id}`);
  await refreshPublicCacheAfterAdminWrite();
  return data;
}

export type ImportExcelInput =
  | { uri: string; name: string; mimeType?: string }
  | { file: File };

export async function importProductsExcel(input: ImportExcelInput) {
  const form = new FormData();

  // ✅ WEB: recibimos File directamente
  if ("file" in input) {
    form.append("file", input.file);
  } else {
    // ✅ RN (Android/iOS): FormData file object con uri
    form.append("file", {
      uri: input.uri,
      name: input.name,
      type:
        input.mimeType ??
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    } as any);
  }

  // ⚠️ En React Native, setear manualmente "Content-Type" puede romper el boundary.
  // Dejamos que axios lo resuelva.
  const { data } = await api.post("/admin/productos/import-excel", form);
  await refreshPublicCacheAfterAdminWrite();

  return data;
}

