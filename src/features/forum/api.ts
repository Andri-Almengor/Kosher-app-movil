import { api } from "@/lib/api/client";

export type ForoCategoria = {
  id: number;
  nombre: string;
  descripcion?: string | null;
};

export type ForoHilo = {
  id: number;
  categoriaId: number;
  usuarioId: number;
  titulo: string;
  contenido: string;
  productoId?: number | null;
  creadoEn: string;
  actualizadoEn: string;
};

export type ForoRespuesta = {
  id: number;
  hiloId: number;
  usuarioId: number;
  contenido: string;
  creadoEn: string;
  actualizadoEn: string;
  esEliminado: boolean;
};

export async function getCategoriasForo(): Promise<ForoCategoria[]> {
  const { data } = await api.get<ForoCategoria[]>("/foro/categorias");
  return data;
}

export async function getHilos(categoriaId?: number): Promise<ForoHilo[]> {
  const { data } = await api.get<ForoHilo[]>("/foro/hilos", {
    params: categoriaId ? { categoriaId } : undefined,
  });
  return data;
}

export async function crearHilo(input: {
  categoriaId: number;
  titulo: string;
  contenido: string;
  productoId?: number | null;
}): Promise<ForoHilo> {
  const { data } = await api.post<ForoHilo>("/foro/hilos", input);
  return data;
}

export async function crearRespuesta(hiloId: number, contenido: string): Promise<ForoRespuesta> {
  const { data } = await api.post<ForoRespuesta>(`/foro/hilos/${hiloId}/respuestas`, {
    contenido,
  });
  return data;
}

export async function likeRespuesta(respuestaId: number) {
  const { data } = await api.post(`/foro/respuestas/${respuestaId}/like`);
  return data;
}
