import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const secureJsonStorage = {
  async getItem(name: string): Promise<string | null> {
    if (Platform.OS === "web") return AsyncStorage.getItem(name);
    return SecureStore.getItemAsync(name);
  },
  async setItem(name: string, value: string): Promise<void> {
    if (Platform.OS === "web") return AsyncStorage.setItem(name, value);
    await SecureStore.setItemAsync(name, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },
  async removeItem(name: string): Promise<void> {
    if (Platform.OS === "web") return AsyncStorage.removeItem(name);
    await SecureStore.deleteItemAsync(name);
  },
};
