import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform } from "react-native";
import { getExpoNotifications } from "@/lib/notifications/expoNotificationsSafe";
import { getCurrentTab } from "@/lib/ui/activeTab";

type NoticiaLite = {
  id: number | string;
  titulo?: string | null;
  creadoEn?: string | null;
  actualizadoEn?: string | null;
  notifyUsers?: boolean | null;
};

const BASELINE_KEY = "newsNotifications:baseline:v1";
const NOTIFIED_IDS_KEY = "newsNotifications:notifiedIds:v1";
const CHANNEL_ID = "news-updates";

let configured = false;

async function ensureConfigured() {
  if (configured) return true;

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

  const perms = await Notifications.getPermissionsAsync();
  if (!perms.granted) {
    const req = await Notifications.requestPermissionsAsync();
    if (!req.granted) return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
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

function getItemTime(item: NoticiaLite) {
  const raw = item.actualizadoEn || item.creadoEn || 0;
  const value = new Date(raw as any).getTime();
  return Number.isFinite(value) ? value : 0;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

async function saveJson<T>(key: string, value: T) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function notifyForNewNewsItems(items: NoticiaLite[], opts?: { currentTab?: string | null; lang?: "es" | "en" }) {
  const currentTab = opts?.currentTab ?? getCurrentTab();
  if (currentTab === "Novedades") return;

  const baseline = await readJson<number | null>(BASELINE_KEY, null);
  const notifiedIds = await readJson<Array<number | string>>(NOTIFIED_IDS_KEY, []);

  const notificationCandidates = (items ?? [])
    .filter((item) => item?.notifyUsers === true)
    .sort((a, b) => getItemTime(b) - getItemTime(a));

  if (!notificationCandidates.length) {
    if (baseline == null && items.length) {
      const newestTime = Math.max(...items.map(getItemTime), 0);
      await saveJson(BASELINE_KEY, newestTime || Date.now());
    }
    return;
  }

  if (baseline == null) {
    const newestTime = Math.max(...items.map(getItemTime), 0);
    await saveJson(BASELINE_KEY, newestTime || Date.now());
    return;
  }

  const freshItems = notificationCandidates.filter((item) => {
    const itemId = item.id;
    return getItemTime(item) > baseline && !notifiedIds.includes(itemId);
  });

  if (!freshItems.length) {
    const newestTime = Math.max(...items.map(getItemTime), baseline);
    await saveJson(BASELINE_KEY, newestTime);
    return;
  }

  const latest = freshItems[0];
  const isEn = opts?.lang === "en";
  const title = isEn ? "New update published" : "Se publicó una nueva novedad";
  const countText = freshItems.length > 1
    ? isEn
      ? `and ${freshItems.length - 1} more`
      : `y ${freshItems.length - 1} más`
    : "";
  const body = [latest?.titulo?.trim() || (isEn ? "Check the latest post." : "Revisa la publicación más reciente."), countText]
    .filter(Boolean)
    .join(" ");

  try {
    Alert.alert(title, body);
  } catch {}

  const Notifications = await getExpoNotifications();
  const allowed = await ensureConfigured();
  if (allowed && Notifications) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  }

  const newestTime = Math.max(...items.map(getItemTime), baseline);
  await Promise.all([
    saveJson(BASELINE_KEY, newestTime),
    saveJson(NOTIFIED_IDS_KEY, Array.from(new Set([...notifiedIds, ...freshItems.map((item) => item.id)]))),
  ]);
}
