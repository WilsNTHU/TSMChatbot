function getNotificationApi() {
  return globalThis.Notification;
}

export async function requestNotificationPermission() {
  const BrowserNotification = getNotificationApi();
  if (!BrowserNotification) {
    return "unsupported";
  }

  if (BrowserNotification.permission === "granted") {
    return "granted";
  }

  if (BrowserNotification.permission !== "denied") {
    return await BrowserNotification.requestPermission();
  }

  return BrowserNotification.permission;
}

export function showMessageNotification({ title, body }) {
  const BrowserNotification = getNotificationApi();
  if (!BrowserNotification) {
    return;
  }

  if (BrowserNotification.permission !== "granted") {
    return;
  }

  new BrowserNotification(title, {
    body,
    icon: "/vite.svg"
  });
}