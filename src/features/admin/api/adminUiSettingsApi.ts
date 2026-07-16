import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/lib/api/client";
import { cacheImage } from "@/offline/imageCache";

export type ProductsHomeCardConfig = {
  activo: boolean;
  imageUrl: string;
  titleEs: string;
  titleEn: string;
  subtitleEs?: string;
  subtitleEn?: string;
  primaryButtonEs: string;
  primaryButtonEn: string;
  primaryUrl: string;
  secondaryButtonEs?: string;
  secondaryButtonEn?: string;
  secondaryUrl?: string;
  visibleFilters: string[];
  showImage?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showPrimaryButton?: boolean;
  showSecondaryButton?: boolean;
};

const PUBLIC_PRODUCTS_HOME_CARD_CACHE_KEY = "ui-settings:products-home-card:public:v1";
const ADMIN_PRODUCTS_HOME_CARD_CACHE_KEY = "ui-settings:products-home-card:admin:v1";

async function readCachedConfig(key: string): Promise<ProductsHomeCardConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ProductsHomeCardConfig) : null;
  } catch {
    return null;
  }
}

async function persistConfig(key: string, config: ProductsHomeCardConfig) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(config));
  } catch {}
  try {
    if (config?.imageUrl) await cacheImage(config.imageUrl);
  } catch {}
}

export async function getStoredProductsHomeCardConfig() {
  return readCachedConfig(PUBLIC_PRODUCTS_HOME_CARD_CACHE_KEY);
}

export async function getAdminProductsHomeCardConfig() {
  try {
    const { data } = await api.get<ProductsHomeCardConfig>("/admin/ui-settings/products-home-card");
    await persistConfig(ADMIN_PRODUCTS_HOME_CARD_CACHE_KEY, data);
    return data;
  } catch (error) {
    const cached = await readCachedConfig(ADMIN_PRODUCTS_HOME_CARD_CACHE_KEY);
    if (cached) return cached;
    throw error;
  }
}

export async function updateAdminProductsHomeCardConfig(payload: ProductsHomeCardConfig) {
  const { data } = await api.put<ProductsHomeCardConfig>("/admin/ui-settings/products-home-card", payload);
  const merged = { ...payload, ...data };
  await Promise.all([
    persistConfig(ADMIN_PRODUCTS_HOME_CARD_CACHE_KEY, merged),
    persistConfig(PUBLIC_PRODUCTS_HOME_CARD_CACHE_KEY, merged),
  ]);
  return merged;
}

export async function getProductsHomeCardConfig() {
  try {
    const { data } = await api.get<ProductsHomeCardConfig>("/ui-settings/products-home-card");
    await persistConfig(PUBLIC_PRODUCTS_HOME_CARD_CACHE_KEY, data);
    return data;
  } catch (error) {
    const cached = await readCachedConfig(PUBLIC_PRODUCTS_HOME_CARD_CACHE_KEY);
    if (cached) return cached;
    throw error;
  }
}
