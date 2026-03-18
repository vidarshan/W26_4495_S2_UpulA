export const showLocalNotification = async (title: string, url: string) => {
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
    alert("Notifications are not supported in this browser.");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    alert("Notification permission was not granted.");
  }
};
