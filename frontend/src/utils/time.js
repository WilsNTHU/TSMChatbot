export const TAIPEI_TZ = "Asia/Taipei";

export function formatTaipeiTime(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);

  return d.toLocaleString("zh-TW", {
    timeZone: TAIPEI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

export function formatTaipeiClock(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);

  return d.toLocaleString("zh-TW", {
    timeZone: TAIPEI_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}
