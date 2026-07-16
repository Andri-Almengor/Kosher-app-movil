import products from "../../../..//assets/mock/products.json";
import { Product } from "../api/types";

export const LocalProductDataSource = {
  async list(): Promise<Product[]> {
    // Simula latencia
    await new Promise(r => setTimeout(r, 200));
    return products as Product[];
  },
  async getById(id: string): Promise<Product | undefined> {
    return (products as Product[]).find(p => p.id === id);
  }
};
