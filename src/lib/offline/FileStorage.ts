import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export type OfflineResourceKind = "image" | "file";

const ROOT_DIR = `${FileSystem.documentDirectory ?? ""}offline/`;
const IMAGES_DIR = `${ROOT_DIR}images/`;
const FILES_DIR = `${ROOT_DIR}files/`;
const TMP_DIR = `${ROOT_DIR}tmp/`;

function assertNative() {
  if (Platform.OS === "web") {
    throw new Error("Offline persistent storage is only supported on native platforms.");
  }
  if (!FileSystem.documentDirectory) {
    throw new Error("documentDirectory is not available.");
  }
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 140);
}

function hashString(input: string) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function extractExtensionFromUrl(url: string, fallback = ".bin") {
  try {
    const clean = url.split("?")[0].split("#")[0];
    const match = clean.match(/\.(jpg|jpeg|png|webp|gif|bmp|heic|svg|pdf|doc|docx|xls|xlsx|zip|json|txt|mp4|mp3)$/i);
    return match?.[0]?.toLowerCase() ?? fallback;
  } catch {
    return fallback;
  }
}

function getKindDir(kind: OfflineResourceKind) {
  return kind === "image" ? IMAGES_DIR : FILES_DIR;
}

export function buildResourceKey(params: {
  url: string;
  kind: OfflineResourceKind;
  version?: string | number | null;
  explicitKey?: string | null;
}) {
  const { url, kind, version, explicitKey } = params;
  const base = explicitKey?.trim()
    ? sanitizeSegment(explicitKey.trim())
    : `${kind}_${hashString(`${url}::${String(version ?? "")}`)}`;
  const ext = kind === "image" ? extractExtensionFromUrl(url, ".img") : extractExtensionFromUrl(url, ".bin");
  return `${base}${ext}`;
}

export function getFinalPath(params: {
  url: string;
  kind: OfflineResourceKind;
  version?: string | number | null;
  explicitKey?: string | null;
}) {
  const filename = buildResourceKey(params);
  return `${getKindDir(params.kind)}${filename}`;
}

export function getTempPath(downloadId: string) {
  return `${TMP_DIR}${sanitizeSegment(downloadId)}.part`;
}

export async function ensureOfflineDirs() {
  assertNative();

  await FileSystem.makeDirectoryAsync(ROOT_DIR, { intermediates: true }).catch(() => {});
  await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true }).catch(() => {});
  await FileSystem.makeDirectoryAsync(FILES_DIR, { intermediates: true }).catch(() => {});
  await FileSystem.makeDirectoryAsync(TMP_DIR, { intermediates: true }).catch(() => {});
}

export async function fileExists(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  return !!info.exists;
}

export async function getFileInfo(uri: string) {
  return FileSystem.getInfoAsync(uri);
}

export async function deleteFileIfExists(uri: string) {
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

export async function commitTempFile(tempUri: string, finalUri: string) {
  await deleteFileIfExists(finalUri);
  await FileSystem.moveAsync({ from: tempUri, to: finalUri });
}

export async function resolveStoredUri(params: {
  url?: string | null;
  kind: OfflineResourceKind;
  version?: string | number | null;
  explicitKey?: string | null;
}) {
  const { url, kind, version, explicitKey } = params;
  if (!url || Platform.OS === "web") return url ?? null;

  const finalPath = getFinalPath({ url, kind, version, explicitKey });
  const exists = await fileExists(finalPath);
  return exists ? finalPath : url;
}

export async function hasStoredFile(params: {
  url: string;
  kind: OfflineResourceKind;
  version?: string | number | null;
  explicitKey?: string | null;
}) {
  const finalPath = getFinalPath(params);
  return fileExists(finalPath);
}

export async function removeStoredFile(params: {
  url: string;
  kind: OfflineResourceKind;
  version?: string | number | null;
  explicitKey?: string | null;
}) {
  const finalPath = getFinalPath(params);
  await deleteFileIfExists(finalPath);
}

export async function clearOfflineStorage() {
  if (Platform.OS === "web") return;
  await FileSystem.deleteAsync(ROOT_DIR, { idempotent: true }).catch(() => {});
  await ensureOfflineDirs();
}

export async function cleanupOrphanTempFiles() {
  if (Platform.OS === "web") return;

  await ensureOfflineDirs();
  const list = await FileSystem.readDirectoryAsync(TMP_DIR).catch(() => []);
  await Promise.all(
    (list ?? []).map((name) => deleteFileIfExists(`${TMP_DIR}${name}`))
  );
}

export function getOfflineFolders() {
  return {
    root: ROOT_DIR,
    images: IMAGES_DIR,
    files: FILES_DIR,
    tmp: TMP_DIR,
  };
}