import { getActiveOnlineUserIds } from "../config/presence.js";

export const ALWAYS_ALERT = new Set(["BackendDown"]);

export const SUPPRESSED_ALERTS = new Set(["NoActiveConnections"]);

export function shouldShowAlert(alertName, hasActiveUsers) {
  if (SUPPRESSED_ALERTS.has(alertName)) return false;
  if (!hasActiveUsers && !ALWAYS_ALERT.has(alertName)) return false;
  return true;
}

export async function filterVisibleAlerts(alerts) {
  const onlineUserIds = await getActiveOnlineUserIds();
  const hasActiveUsers = onlineUserIds.length > 0;
  return alerts.filter((entry) => shouldShowAlert(entry.name, hasActiveUsers));
}
