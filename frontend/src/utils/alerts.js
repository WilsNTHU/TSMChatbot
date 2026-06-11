export const ALWAYS_ALERT = new Set(["BackendDown"]);
export const SUPPRESSED_ALERTS = new Set(["NoActiveConnections"]);

export function filterVisibleAlerts(alerts, onlineUsers = 0) {
  const hasActiveUsers = onlineUsers > 0;
  return alerts.filter((alert) => {
    if (SUPPRESSED_ALERTS.has(alert.name)) return false;
    if (!hasActiveUsers && !ALWAYS_ALERT.has(alert.name)) return false;
    return true;
  });
}
