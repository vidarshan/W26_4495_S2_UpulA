export async function showLocalNotification({
  title,
  body,
  url = "/staff/tasks",
}: {
  title: string;
  body: string;
  url?: string;
}) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
  }

  const registration = await navigator.serviceWorker.ready;

  await registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url },
  });
}
