import { apiFetch } from "./http.js";

export async function checkAdminStatus() {
  try {
    const res = await apiFetch("/api/admin/check");
    if (!res.ok) return false;
    const data = await res.json();
    return data.isAdmin === true;
  } catch {
    return false;
  }
}

export async function fetchAdminDashboard() {
  const res = await apiFetch("/api/admin/dashboard");
  if (!res.ok) throw new Error("Failed to load admin dashboard");
  return res.json();
}

export async function adminDeleteUser(userId) {
  const res = await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete user");
  }
  return res.json();
}

export async function adminDeleteRoomMessages(roomId) {
  const res = await apiFetch(`/api/admin/messages/${roomId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete messages");
  return res.json();
}

export async function adminClearAllMessages() {
  const res = await apiFetch("/api/admin/messages", { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to clear all messages");
  return res.json();
}

export async function fetchAlerts() {
  const res = await apiFetch("/api/alerts");
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}
