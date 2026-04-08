import { notifications } from "@mantine/notifications";

export const showLocalNotification = async (title: string, url: string) => {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    notifications.show({
      title: "Notifications unavailable",
      message: "Notifications are not supported in this browser.",
      color: "yellow",
    });
    return;
  }

  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
  }

  const registration = await navigator.serviceWorker.ready;

  await registration.showNotification("Eco Clean", {
    body: title,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      url,
    },
  });
};

export const requestPermission = async () => {
  if (!("Notification" in window)) {
    notifications.show({
      title: "Notifications unavailable",
      message: "Notifications are not supported in this browser.",
      color: "yellow",
    });
    return;
  }

  const permission = await Notification.requestPermission();
};
