// src/lib/offline/cache.ts
import { getLargeJSON, setLargeJSON } from "./largeStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const CacheKeys = {
  products: "cache:products:v1",
  noticias: "cache:noticias:v1",
  events: "cache:events:v1",
  manifest: "cache:manifest:v1",
  manifestEtag: "cache:manifest:etag:v1",
  productsEtag: "cache:products:etag:v1",
  noticiasEtag: "cache:noticias:etag:v1",
  eventsEtag: "cache:events:etag:v1",
} as const;

export async function saveCache<T>(key: string, value: T) {
  await setLargeJSON(key, value);
}

export async function readCache<T>(
  key: string
): Promise<{ value: T; savedAt: string } | null> {
  return getLargeJSON<T>(key);
}


export async function saveString(key: string, value: string) {
  await AsyncStorage.setItem(key, value);
}

export async function readString(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}
