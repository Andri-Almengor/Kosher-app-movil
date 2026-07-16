import Constants from "expo-constants";

type Extra = {
  USE_REMOTE: boolean;
  API_BASE_URL: string;
  /** Optional. If not provided, the app will use a public LibreTranslate instance. */
  TRANSLATE_BASE_URL?: string;
  /** Optional. Some providers require an API key. */
  TRANSLATE_API_KEY?: string;
};

function normalizeBaseUrl(url: string): string {
  let value = String(url ?? "").trim();
  if (!value) return "";

  value = value.replace(/\s+/g, "");
  value = value.replace(/:(\d+):(\d+)($|\/)/, (_m, _a, b, tail) => `:${b}${tail}`);
  value = value.replace(/\/api(\/+)?$/i, "");
  value = value.replace(/\/+$/, "");

  return value;
}

function getExtra(): Partial<Extra> | undefined {
  const expoConfigExtra = (Constants.expoConfig as any)?.extra;
  if (expoConfigExtra) return expoConfigExtra;

  const manifestExtra = (Constants as any)?.manifest?.extra;
  if (manifestExtra) return manifestExtra;

  const manifest2Extra = (Constants as any)?.manifest2?.extra;
  if (manifest2Extra) return manifest2Extra;

  const publicEnvUrl =
    (typeof process !== "undefined" && (process as any)?.env?.EXPO_PUBLIC_API_BASE_URL) ||
    (typeof process !== "undefined" && (process as any)?.env?.API_BASE_URL);

  if (publicEnvUrl) {
    return {
      USE_REMOTE: true,
      API_BASE_URL: normalizeBaseUrl(String(publicEnvUrl)),
    } as Partial<Extra>;
  }

  return undefined;
}

const extra = (getExtra() ?? {}) as Partial<Extra>;

export const ENV: Extra = {
  USE_REMOTE: !!extra.USE_REMOTE,
  API_BASE_URL: normalizeBaseUrl(extra.API_BASE_URL ?? ""),
  TRANSLATE_BASE_URL: extra.TRANSLATE_BASE_URL,
  TRANSLATE_API_KEY: extra.TRANSLATE_API_KEY,
};
