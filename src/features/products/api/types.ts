export type Product = {
  id: string;

  // Datos principales
  categoria: string;
  marca: string;
  detalle: string;

  // Imágenes
  imgProd?: string | null;
  logoSello?: string | null;
  logoGf?: string | null;

  // Información de sello
  sello?: string | null;
  certifica?: string | null;
  pol?: string | null;

  // Información adicional
  gf?: string | null;
  tienda?: string | null;
  pesaj?: string | null; // 👈 en la BD es String
};
