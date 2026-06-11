import { apiFetch } from "./http.js";

export async function searchUsers(keyword) {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) return [];

  const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(normalizedKeyword)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getUserById(userId) {
  const res = await apiFetch(`/api/users/${userId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function updateUserId(newId) {
  const res = await apiFetch("/api/users/me/id", {
    method: "PATCH",
    body: JSON.stringify({ id: newId })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to update user ID");

  localStorage.setItem("tsmchat-token", data.token);
  localStorage.setItem("tsmchat-user", JSON.stringify(data.user));
  return data;
}
