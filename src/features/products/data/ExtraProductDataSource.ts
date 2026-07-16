import { readJSON, writeJSON } from "@/lib/storage/jsonStore";
import { Product } from "../api/types";

const KEY = "extra-products";

export const ExtraProductDataSource = {
  async all(): Promise<Product[]> {
    return readJSON<Product[]>(KEY, []);
  },

  async add(p: Product): Promise<void> {
    const list = await ExtraProductDataSource.all();
    list.push(p);
    await writeJSON(KEY, list);
  },

  async update(p: Product): Promise<void> {
    const list = await ExtraProductDataSource.all();
    const idx = list.findIndex(x => x.id === p.id);
    if (idx >= 0) list[idx] = p;
    await writeJSON(KEY, list);
  },

  async remove(id: string): Promise<void> {
    const list = await ExtraProductDataSource.all();
    const next = list.filter(p => p.id !== id);
    await writeJSON(KEY, next);
  },

  async getById(id: string): Promise<Product | undefined> {
    const list = await ExtraProductDataSource.all();
    return list.find(p => p.id === id);
  }
};
