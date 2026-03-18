"use client";

import { Button, Stack } from "@mantine/core";

export function LocalNotificationDemo() {
  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("Notifications are not supported in this browser.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      alert("Notification permission was not granted.");
    }
  };

  const showTestNotification = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      alert("Notifications are not supported.");
      return;
    }

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }

    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification("Eco Clean", {
      body: "Your local notification is working.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: {
        url: "/staff/tasks",
      },
    });
  };

  return (
    <Stack align="start">
      <Button onClick={requestPermission} variant="default">
        Enable notifications
      </Button>

      <Button onClick={showTestNotification}>Send test notification</Button>
    </Stack>
  );
}
