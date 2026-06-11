import { shouldShowAlert, filterVisibleAlerts } from "./alerts.js";
import { getActiveOnlineUserIds } from "../config/presence.js";

const MAX_ALERTS = 200;

export async function ingestAlertWebhook(payload, alertHistory, io) {
  if (!payload?.alerts) return;

  const onlineUserIds = await getActiveOnlineUserIds();
  const hasActiveUsers = onlineUserIds.length > 0;

  for (const alert of payload.alerts) {
    const alertName = alert.labels?.alertname || "Unknown";
    if (!shouldShowAlert(alertName, hasActiveUsers)) continue;

    const alertId = alert.fingerprint || `${alertName}-${alert.startsAt || ""}`;
    const entry = {
      id: alertId,
      name: alertName,
      severity: alert.labels?.severity || "info",
      status: alert.status,
      summary: alert.annotations?.summary || "",
      description: alert.annotations?.description || "",
      startsAt: alert.startsAt,
      endsAt: alert.endsAt,
      receivedAt: new Date().toISOString()
    };

    const existingIdx = alertHistory.findIndex((a) => a.id === alertId);
    if (existingIdx >= 0) {
      alertHistory[existingIdx] = entry;
    } else {
      alertHistory.unshift(entry);
    }

    console.log(`[ALERT] ${entry.status.toUpperCase()} - ${entry.name}: ${entry.summary}`);
  }

  while (alertHistory.length > MAX_ALERTS) {
    alertHistory.pop();
  }

  const visibleAlerts = await filterVisibleAlerts(alertHistory);
  io.emit("admin_alert", visibleAlerts.slice(0, 20));
}
