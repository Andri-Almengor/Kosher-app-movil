import Constants from "expo-constants";

function isExpoGo() {
  return Constants.appOwnership === "expo" || (Constants as any)?.executionEnvironment === "storeClient";
}

export async function getExpoNotifications() {
  if (isExpoGo()) return null;
  const mod = await import("expo-notifications");
  return mod;
}

export function shouldUseExpoNotifications() {
  return !isExpoGo();
}
