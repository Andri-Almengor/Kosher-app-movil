import type { ExpoConfig } from "expo/config";
declare const process: any;

function normalizeBaseUrl(url: string) {
  let value = String(url ?? "").trim();

  value = value.replace(/\s+/g, "");
  value = value.replace(/:(\d+):(\d+)($|\/)/, (_m, _a, b, tail) => `:${b}${tail}`);
  value = value.replace(/\/api(\/+)?$/i, "");
  value = value.replace(/\/+$/, "");

  return value;
}

export default (): ExpoConfig => ({
  name: "Kosher Costa Rica",
  slug: "kosher-Costa-Rica",
  owner: "andri-almengor",
  version: "3.0.5",
  orientation: "portrait",
  icon: "./assets/ICONODEAPP.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,

  splash: {
    image: "./assets/LOGo_cis.png",
    resizeMode: "cover",
    backgroundColor: "#335fa6",
  },

plugins: [
  "expo-notifications",
  "expo-background-task",
  "expo-font",
  [
    "expo-build-properties",
    {
      android: {
        usesCleartextTraffic: process.env.EXPO_PUBLIC_ALLOW_CLEARTEXT === "true",
      },
    },
  ],
],

 ios: {
  bundleIdentifier: "com.andrialmengor.koshercostarica",
  buildNumber: "9",
  supportsTablet: true,
  icon: "./assets/Icon-apple.png",
  infoPlist: {
    NSPhotoLibraryUsageDescription: "Esta app necesita acceso a tus fotos para subir imágenes.",
    NSCameraUsageDescription: "Esta app necesita acceso a la cámara para tomar imágenes.",
    UIBackgroundModes: ["fetch", "processing"],
    BGTaskSchedulerPermittedIdentifiers: ["com.expo.modules.backgroundtask.processing"]
  },
  config: {
    usesNonExemptEncryption: false
  }
},

  android: {
  package: "com.andrialmengor.koshercostarica",
  googleServicesFile: "./google-services.json",
  adaptiveIcon: {
    foregroundImage: "./assets/ICONODEAPP.png",
    backgroundColor: "#335fa6",
  },
},
  

  extra: {
    USE_REMOTE: true,
    API_BASE_URL: normalizeBaseUrl(
      process.env.EXPO_PUBLIC_API_BASE_URL ??
        process.env.API_BASE_URL ??
        "https://app-kosher-costa-rica.onrender.com"
    ),
    eas: {
      projectId: "121697d8-e2d1-4739-a9f9-c33b2cc4a534",
    },
  },
});