import AsyncStorage from "@react-native-async-storage/async-storage";

const keyForUser = (userId: number | string) => `calendar_subscriptions_user_${userId}`;

/**
 * Guardamos un mapa por usuario:
 * {
 *   [eventId: number]: { notificationId?: string; remindAtISO?: string }
 * }
 */
export type UserSubscriptionsMap = Record<
  number,
  { notificationId?: string; remindAtISO?: string }
>;

export async function getUserSubscriptions(userId: number | string) {
  const raw = await AsyncStorage.getItem(keyForUser(userId));
  if (!raw) return {} as UserSubscriptionsMap;
  try {
    return JSON.parse(raw) as UserSubscriptionsMap;
  } catch {
    return {} as UserSubscriptionsMap;
  }
}

export async function isEventSubscribed(userId: number | string, eventId: number) {
  const map = await getUserSubscriptions(userId);
  return Boolean(map[eventId]);
}

export async function setEventSubscribed(
  userId: number | string,
  eventId: number,
  data: { notificationId?: string; remindAtISO?: string }
) {
  const map = await getUserSubscriptions(userId);
  map[eventId] = data;
  await AsyncStorage.setItem(keyForUser(userId), JSON.stringify(map));
  return map;
}

export async function removeEventSubscribed(userId: number | string, eventId: number) {
  const map = await getUserSubscriptions(userId);
  delete map[eventId];
  await AsyncStorage.setItem(keyForUser(userId), JSON.stringify(map));
  return map;
}

export async function listSubscribedEventIds(userId: number | string) {
  const map = await getUserSubscriptions(userId);
  return Object.keys(map).map((k) => Number(k)).filter((n) => !Number.isNaN(n));
}
