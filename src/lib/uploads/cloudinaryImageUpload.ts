import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";
import { api } from "@/lib/api/client";
import { useAuth } from "@/app/auth/authStore";

type QueueItem = {
  id: string;
  uri: string;
  oldUrl?: string;
  folder?: string;
  createdAt: number;
};

const QUEUE_KEY = "admin_cloudinary_image_upload_queue_v1";
const ENDPOINT = "/admin/uploads/image";

function getUploadUrl() {
  const base = String(api.defaults.baseURL || "").replace(/\/+$/, "");
  return `${base}${ENDPOINT}`;
}

function getAuthHeader() {
  const token = useAuth.getState().token;
  return token ? `Bearer ${token}` : "";
}

async function readQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueueItem[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueCloudinaryImageUpload(item: Omit<QueueItem, "id" | "createdAt">) {
  const queue = await readQueue();
  const next: QueueItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  };
  await writeQueue([...queue, next]);
  return next;
}

export async function getCloudinaryUploadQueueCount() {
  return (await readQueue()).length;
}

export async function removeCloudinaryUploadQueueItem(id: string) {
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.id !== id));
}

export async function compressImageIfPossible(uri: string) {
  if (Platform.OS === "web") return uri;

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri;
  }
}

function appendNativeFile(formData: FormData, uri: string) {
  const cleanUri = String(uri || "");
  const extension = cleanUri.split("?")[0]?.split(".").pop()?.toLowerCase() || "jpg";
  const mime = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";

  formData.append("file", {
    uri: cleanUri,
    type: mime,
    name: `upload-${Date.now()}.${extension}`,
  } as any);
}

export async function uploadImageToCloudinaryServer(params: {
  uri?: string;
  file?: File;
  oldUrl?: string;
  folder?: string;
  onProgress?: (progress: number) => void;
}) {
  const formData = new FormData();

  if (params.file) {
    formData.append("file", params.file);
  } else if (params.uri) {
    const compressedUri = await compressImageIfPossible(params.uri);
    appendNativeFile(formData, compressedUri);
  } else {
    throw new Error("No se recibió ninguna imagen para subir.");
  }

  if (params.oldUrl) formData.append("oldUrl", params.oldUrl);
  if (params.folder) formData.append("folder", params.folder);

  return await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", getUploadUrl());

    const auth = getAuthHeader();
    if (auth) xhr.setRequestHeader("Authorization", auth);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && params.onProgress) {
        params.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && data?.url) {
          params.onProgress?.(100);
          resolve(String(data.url));
          return;
        }
        reject(new Error(data?.message || data?.error || "No se pudo subir la imagen."));
      } catch (error) {
        reject(error);
      }
    };

    xhr.onerror = () => reject(new Error("No se pudo conectar con el servidor para subir la imagen."));
    xhr.ontimeout = () => reject(new Error("La subida tardó demasiado y fue cancelada."));
    xhr.timeout = 120000;
    xhr.send(formData);
  });
}

export async function processCloudinaryUploadQueue(onUploaded?: (item: QueueItem, url: string) => void) {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return { processed: 0, remaining: await getCloudinaryUploadQueueCount() };

  const queue = await readQueue();
  let processed = 0;

  for (const item of queue) {
    try {
      const url = await uploadImageToCloudinaryServer({ uri: item.uri, oldUrl: item.oldUrl, folder: item.folder });
      await removeCloudinaryUploadQueueItem(item.id);
      processed += 1;
      onUploaded?.(item, url);
    } catch {
      break;
    }
  }

  return { processed, remaining: await getCloudinaryUploadQueueCount() };
}
