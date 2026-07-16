import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { ENV } from "../../config/env";
import { useApiLogStore } from "../../features/admin/logging/logStore";

function normalizeBaseUrl(url: string): string {
  let u = String(url ?? "").trim();
  if (!u) return "";

  u = u.replace(/\s+/g, "");
  u = u.replace(/:(\d+):(\d+)($|\/)/, (_m, _a, b, tail) => `:${b}${tail}`);
  u = u.replace(/\/api(\/+)?$/i, "");
  u = u.replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(u)) return "";
  const isDev = typeof __DEV__ !== "undefined" && __DEV__;
  if (!isDev && /^http:\/\//i.test(u)) return "";
  return `${u}/api`;
}

function getExpoHostCandidates(): string[] {
  const hostUri = String(
    (Constants.expoConfig as any)?.hostUri ||
      (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
      ""
  ).trim();

  if (!hostUri) return [];

  const host = hostUri.split(":")[0]?.trim();
  if (!host) return [];

  return [
    normalizeBaseUrl(`http://${host}:4000`),
    normalizeBaseUrl(`http://${host}:3000`),
  ].filter(Boolean);
}

function canUseCandidateOnWeb(candidate: string): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return true;
  if (!candidate) return false;

  try {
    const pageProtocol = window.location.protocol;
    const url = new URL(candidate.replace(/\/api$/i, ""));

    if (pageProtocol === "https:" && url.protocol !== "https:") return false;

    return true;
  } catch {
    return false;
  }
}

function getWebRuntimeCandidates(): string[] {
  if (Platform.OS !== "web" || typeof window === "undefined") return [];

  const origin = window.location.origin;
  const host = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  const isDev = typeof __DEV__ !== "undefined" && __DEV__;
  const queryApi = isDev ? params.get("api") || "" : "";

  const storedApi = (() => {
    try {
      return isDev ? window.localStorage.getItem("api_base_url_override") || "" : "";
    } catch {
      return "";
    }
  })();

  const candidates = [
    normalizeBaseUrl(queryApi),
    normalizeBaseUrl(storedApi),
    normalizeBaseUrl(String(ENV?.API_BASE_URL ?? "")),
  ].filter(Boolean);

  if (host === "localhost" || host === "127.0.0.1") {
    candidates.push(normalizeBaseUrl("http://localhost:4000"));
  } else {
    candidates.push(normalizeBaseUrl(origin));
  }

  return Array.from(new Set(candidates)).filter(canUseCandidateOnWeb);
}

function resolveBaseUrl(): string {
  const envUrl = normalizeBaseUrl(String(ENV?.API_BASE_URL ?? ""));

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const candidates = getWebRuntimeCandidates();
    if (candidates.length > 0) return candidates[0];
    return envUrl || "";
  }

  if (envUrl) return envUrl;

  const expoCandidates = getExpoHostCandidates();
  if (expoCandidates.length > 0) return expoCandidates[0];

  return (
    normalizeBaseUrl("http://10.0.2.2:4000") ||
    normalizeBaseUrl("http://localhost:4000")
  );
}

export const baseURL = resolveBaseUrl();

export const api = axios.create({
  baseURL,
  timeout: 25000,
});

export function setApiBaseUrl(urlOrNull: string | null): void {
  const next = urlOrNull ? normalizeBaseUrl(urlOrNull) : resolveBaseUrl();
  api.defaults.baseURL = next;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const isDev = typeof __DEV__ !== "undefined" && __DEV__;
    try {
      if (urlOrNull && isDev) {
        window.localStorage.setItem("api_base_url_override", urlOrNull);
      } else {
        window.localStorage.removeItem("api_base_url_override");
      }
    } catch {}
  }

  try {
    useApiLogStore.getState().add("info", "baseURL updated", { baseURL: next });
  } catch {}
}

api.interceptors.request.use((config) => {
  const url = `${config.baseURL ?? ""}${config.url ?? ""}`;

  try {
    useApiLogStore.getState().add("info", "request", {
      method: String(config.method ?? "GET").toUpperCase(),
      url,
      params: config.params ?? null,
    });
  } catch {}

  return config;
});

api.interceptors.response.use(
  (res) => {
    try {
      useApiLogStore.getState().add("info", "response", {
        url: `${res.config?.baseURL ?? ""}${res.config?.url ?? ""}`,
        status: res.status,
      });
    } catch {}

    return res;
  },
  (error) => {
    const url = `${error?.config?.baseURL ?? ""}${error?.config?.url ?? ""}`;

    if (error?.response) {
      try {
        useApiLogStore.getState().add("error", "http_error", {
          url,
          status: error.response.status,
          data: "[redacted]",
        });
      } catch {}
    } else {
      try {
        useApiLogStore.getState().add("error", "no_response", {
          url,
          message: String(error?.message || "Error de red").slice(0, 140),
          code: error?.code,
        });
      } catch {}
    }

    return Promise.reject(error);
  }
);

export async function putWithPatchFallback<T = any>(url: string, payload?: any): Promise<T> {
  try {
    const { data } = await api.put<T>(url, payload);
    return data;
  } catch (error: any) {
    const status = error?.response?.status;
    const shouldTryPatch = !error?.response || status === 404 || status === 405 || status === 501;
    if (!shouldTryPatch) throw error;
    const { data } = await api.patch<T>(url, payload);
    return data;
  }
}

export function setAuthToken(token: string | null): void {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}