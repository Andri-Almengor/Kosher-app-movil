import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadCachedProductos, loadCachedNoticias, loadCachedRestaurantes, syncAllIfOnline } from "@/offline/sync";
import { getStoredProductsHomeCardConfig } from "@/features/admin/api/adminUiSettingsApi";
import { offlineDownloadManager } from "@/lib/offline/DownloadManager";
import { hasStoredFile, clearOfflineStorage } from "@/lib/offline/FileStorage";

const PREF_KEY = "products:offlineImages:enabled:v2";
const ASKED_KEY = "products:offlineImages:asked:v2";

function extractImageUrls(items: any[]) {
  const urls = new Set<string>();
  for (const item of items ?? []) {
    for (const key of ["fotoProducto", "imgProd", "fotoSello1", "fotoSello2", "logoSello", "logoGf", "imageUrl"]) {
      const value = item?.[key];
      if (typeof value === "string" && /^https?:\/\//i.test(value)) urls.add(value);
    }
  }
  return Array.from(urls);
}

function extractFileUrls(items: any[]) {
  const urls = new Set<string>();
  for (const item of items ?? []) {
    const value = item?.fileUrl;
    if (typeof value === "string" && /^https?:\/\//i.test(value)) urls.add(value);
  }
  return Array.from(urls);
}

async function loadOfflineUniverse() {
  const [products, noticias, restaurantes, homeCardConfig] = await Promise.all([
    loadCachedProductos<any>(),
    loadCachedNoticias<any>(),
    loadCachedRestaurantes<any>(),
    getStoredProductsHomeCardConfig(),
  ]);

  const extraImageUrls = [homeCardConfig?.imageUrl].filter(
    (value): value is string => !!value && /^https?:\/\//i.test(value)
  );

  const imageUrls = Array.from(
    new Set([
      ...extractImageUrls(products),
      ...extractImageUrls(noticias),
      ...extractImageUrls(restaurantes),
      ...extraImageUrls,
    ])
  );

  const fileUrls = Array.from(new Set([...extractFileUrls(noticias)]));

  return { imageUrls, fileUrls };
}

export async function getOfflineImagesEnabled() {
  return (await AsyncStorage.getItem(PREF_KEY)) === "1";
}

export async function setOfflineImagesEnabled(value: boolean) {
  await AsyncStorage.setItem(PREF_KEY, value ? "1" : "0");
  if (!value) {
    await offlineDownloadManager.pauseActive();
  }
}

export async function getOfflineImagesAsked() {
  return (await AsyncStorage.getItem(ASKED_KEY)) === "1";
}

export async function setOfflineImagesAsked(value: boolean) {
  await AsyncStorage.setItem(ASKED_KEY, value ? "1" : "0");
}

export async function getOfflineImagesProgress() {
  await offlineDownloadManager.init();
  return offlineDownloadManager.getState().progress;
}

export async function getOfflineImagesSummary() {
  await offlineDownloadManager.init();
  const enabled = await getOfflineImagesEnabled();
  const asked = await getOfflineImagesAsked();
  const { imageUrls, fileUrls } = await loadOfflineUniverse();

  let storedCount = 0;
  for (const url of imageUrls) {
    if (await hasStoredFile({ url, kind: "image" })) storedCount += 1;
  }
  for (const url of fileUrls) {
    if (await hasStoredFile({ url, kind: "file" })) storedCount += 1;
  }

  const state = offlineDownloadManager.getState();

  return {
    enabled,
    asked,
    running: state.processing || state.progress.running > 0,
    stats: {
      count: storedCount,
      indexed: storedCount,
      totalKnown: imageUrls.length + fileUrls.length,
    },
    progress: {
      downloaded: state.progress.completed,
      total: state.progress.total,
      percent: state.progress.percent,
      running: state.progress.running,
      queued: state.progress.queued,
      failed: state.progress.failed,
    },
  };
}

export async function cancelOfflineWarmup() {
  await offlineDownloadManager.pauseActive();
  return { ok: true };
}

export async function warmProductImages(options: { autoStart?: boolean } = {}) {
  const enabled = await getOfflineImagesEnabled();
  if (!enabled) {
    return { ok: false, reason: "disabled" as const };
  }

  await offlineDownloadManager.init();
  await syncAllIfOnline(() => {});

  const { imageUrls, fileUrls } = await loadOfflineUniverse();

  await offlineDownloadManager.enqueueMany(
    imageUrls.map((url) => ({
      url,
      kind: "image" as const,
      priority: 10,
      maxRetries: 4,
    })),
    { autoStart: false }
  );

  await offlineDownloadManager.enqueueMany(
    fileUrls.map((url) => ({
      url,
      kind: "file" as const,
      priority: 8,
      maxRetries: 4,
    })),
    { autoStart: false }
  );

  if (options.autoStart !== false) {
    await offlineDownloadManager.processPending({
      // Descarga completa mientras la app permanezca abierta o minimizada.
      // Si el usuario mata la app, el sistema detiene el proceso; al abrirla se reanuda.
      maxItems: Number.MAX_SAFE_INTEGER,
      maxDurationMs: 6 * 60 * 60 * 1000,
    });
  }

  return { ok: true, total: imageUrls.length + fileUrls.length };
}

export async function purgeOfflineImages() {
  await offlineDownloadManager.pauseActive();
  await offlineDownloadManager.clearAll();
  await clearOfflineStorage();
  await setOfflineImagesEnabled(false);
  return { ok: true };
}