import AsyncStorage from "@react-native-async-storage/async-storage";

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}
export async function writeJSON<T>(key: string, val: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(val));
}
