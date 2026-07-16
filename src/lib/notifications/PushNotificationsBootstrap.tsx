import { useEffect } from "react";
import { AppState } from "react-native";
import { useI18n } from "@/i18n/I18nProvider";
import { getExpoNotifications } from "@/lib/notifications/expoNotificationsSafe";
import {
  configurePushNotifications,
  getNotificationData,
  registerDeviceForPushNotifications,
} from "@/lib/notifications/pushNotifications";
import { navigateFromPushData } from "@/lib/notifications/notificationNavigation";

export function PushNotificationsBootstrap() {
  const { lang } = useI18n();

  useEffect(() => {
    let mounted = true;
    let responseSub: any;
    let receivedSub: any;

    async function start() {
      await configurePushNotifications();
      if (!mounted) return;

      await registerDeviceForPushNotifications(lang);

      const Notifications = await getExpoNotifications();
      if (!Notifications || !mounted) return;

      responseSub = Notifications.addNotificationResponseReceivedListener((response: any) => {
        navigateFromPushData(getNotificationData(response?.notification));
      });

      receivedSub = Notifications.addNotificationReceivedListener(() => {
        // Reservado para badges o sincronización futura cuando llegue una push con la app abierta.
      });

      const lastResponse = await Notifications.getLastNotificationResponseAsync?.();
      if (lastResponse?.notification) {
        setTimeout(() => navigateFromPushData(getNotificationData(lastResponse.notification)), 250);
      }
    }

    start();

    return () => {
      mounted = false;
      responseSub?.remove?.();
      receivedSub?.remove?.();
    };
  }, [lang]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") registerDeviceForPushNotifications(lang);
    });

    return () => sub.remove();
  }, [lang]);

  return null;
}
