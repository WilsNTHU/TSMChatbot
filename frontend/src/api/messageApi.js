import { apiFetch } from "./http.js";

export async function getMessages(roomId) {
  const res = await apiFetch(`/api/messages/${roomId}`);
  if (!res.ok) throw new Error("Failed to get messages");
  return res.json();
}

export async function sendMessage(roomId, text) {
  const res = await apiFetch(`/api/messages/${roomId}`, {
    method: "POST",
    body: JSON.stringify({ text })
  });

  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

export async function clearMessages(roomId) {
  const res = await apiFetch(`/api/messages/${roomId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to clear messages");
  return res.json();
}
