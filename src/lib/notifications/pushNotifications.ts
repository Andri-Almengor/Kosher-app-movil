import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "@/lib/api/client";
import { getExpoNotifications, shouldUseExpoNotifications } from "@/lib/notifications/expoNotificationsSafe";

export type PushLanguage = "es" | "en";

export type PushNotificationData = {
  screen?: string;
  type?: "news" | "product" | "restaurant" | string;
  id?: string | number;
  newsId?: string | number;
  productoId?: string | number;
  restauranteId?: string | number;
  [key: string]: unknown;
};

const EXPO_PUSH_TOKEN_KEY = "kccr.push.expoToken:v1";
const DEVICE_ID_KEY = "kccr.push.deviceId:v1";
const CHANNEL_NEWS = "news-updates";
const CHANNEL_GENERAL = "general-updates";

let configured = false;
let registering = false;

function createLocalId() {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getDeviceId() {
  const current = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (current) return current;

  const next = createLocalId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

function getProjectId(): string | undefined {
  return (
    (Constants as any)?.easConfig?.projectId ||
    (Constants.expoConfig as any)?.extra?.eas?.projectId ||
    (Constants as any)?.manifest2?.extra?.expoClient?.extra?.eas?.projectId ||
    (Constants.expoConfig as any)?.extra?.projectId
  );
}

export async function configurePushNotifications() {
  if (configured) return true;
  if (!shouldUseExpoNotifications()) return false;

  const Notifications = await getExpoNotifications();
  if (!Notifications) return false;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_GENERAL, {
      name: "General",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync(CHANNEL_NEWS, {
      name: "Novedades",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  configured = true;
  return true;
}

export async function requestPushPermissions() {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return !!requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function getExpoPushToken() {
  const Notifications = await getExpoNotifications();
  if (!Notifications) return null;

  const projectId = getProjectId();
  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return tokenResponse.data;
}

export async function registerDeviceForPushNotifications(lang: PushLanguage = "es") {
  if (registering) return null;
  registering = true;

  try {
    const configuredOk = await configurePushNotifications();
    if (!configuredOk) return null;

    const allowed = await requestPushPermissions();
    if (!allowed) return null;

    const expoPushToken = await getExpoPushToken();
    if (!expoPushToken) return null;

    await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, expoPushToken);

    // Backend futuro. Si todavía no existe, fallará silenciosamente para no romper la app.
    try {
      await api.post("/push-tokens/register", {
        token: expoPushToken,
        provider: "expo",
        platform: Platform.OS,
        language: lang,
        deviceId: await getDeviceId(),
        appVersion: Constants.expoConfig?.version ?? null,
      });
    } catch {}

    return expoPushToken;
  } catch {
    return null;
  } finally {
    registering = false;
  }
}

export async function unregisterDeviceForPushNotifications() {
  const expoPushToken = await AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
  if (!expoPushToken) return;

  try {
    await api.post("/push-tokens/unregister", {
      token: expoPushToken,
      platform: Platform.OS,
      deviceId: await getDeviceId(),
    });
  } catch {}
}

export function getNotificationData(raw: any): PushNotificationData {
  return (raw?.request?.content?.data ?? raw?.content?.data ?? raw?.data ?? {}) as PushNotificationData;
}
