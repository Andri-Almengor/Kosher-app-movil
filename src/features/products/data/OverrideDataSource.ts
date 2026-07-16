import { readJSON, writeJSON } from "@/lib/storage/jsonStore";
import type { Product } from "../api/types";

const KEY = "products-overrides"; // id -> Product

export async function getOverridesMap(): Promise<Record<string, Product>> {
  return readJSON<Record<string, Product>>(KEY, {});
}

export async function setOverride(p: Product): Promise<void> {
  const map = await getOverridesMap();
  map[p.id] = p;
  await writeJSON(KEY, map);
}
