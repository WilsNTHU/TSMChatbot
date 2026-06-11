import { apiFetch } from "./http.js";

export async function getChatrooms() {
  const res = await apiFetch("/api/chatrooms");
  if (!res.ok) throw new Error("Failed to get chatrooms");
  return res.json();
}

export async function createChatroom(targetUserId, targetDisplayName = targetUserId) {
  const res = await apiFetch("/api/chatrooms", {
    method: "POST",
    body: JSON.stringify({
      type: "direct",
      name: targetDisplayName,
      targetUserId
    })
  });

  if (!res.ok) throw new Error("Failed to create chatroom");
  return res.json();
}

export async function createGroupChatroom(name, memberIds) {
  const res = await apiFetch("/api/chatrooms", {
    method: "POST",
    body: JSON.stringify({
      type: "group",
      name,
      memberIds
    })
  });

  if (!res.ok) throw new Error("Failed to create group");
  return res.json();
}

export async function deleteRoom(roomId) {
  const res = await apiFetch(`/api/chatrooms/${roomId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete room");
  return getChatrooms();
}

export async function leaveGroup(roomId) {
  return deleteRoom(roomId);
}
