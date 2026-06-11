export function getDirectPeerProfile(room) {
  if (!room || room.type !== "direct") return null;
  return room.memberProfiles?.[0] || null;
}

export function getDirectPeerId(room) {
  if (!room || room.type !== "direct") return "";
  return room.userId || getDirectPeerProfile(room)?.id || "";
}

export function isDirectPeerOnline(room) {
  const peerId = getDirectPeerId(room);
  if (!peerId) return false;
  return room.onlineUsers?.includes(peerId) ?? false;
}

export function getGroupOnlineCount(room, currentUserId = "") {
  return (room.onlineUsers || []).filter(
    (id) => !currentUserId || id !== currentUserId
  ).length;
}

export function getRoomAvatarProps(room) {
  if (!room) {
    return { text: "?", imageUrl: "" };
  }

  if (room.type === "direct") {
    const peer = getDirectPeerProfile(room);
    if (peer) {
      return {
        text:
          peer.avatarText ||
          peer.name?.slice(0, 2).toUpperCase() ||
          peer.id?.slice(0, 2).toUpperCase() ||
          "?",
        imageUrl: peer.avatarUrl || ""
      };
    }
  }

  return {
    text: room.name?.slice(0, 2).toUpperCase() || "?",
    imageUrl: ""
  };
}

const UUID_EPOCH_UNIX_MS = 12219292800000;

function getUuidV1TimestampMs(id) {
  if (!id || typeof id !== "string") return null;

  const hex = id.replace(/-/g, "").toLowerCase();
  if (hex.length !== 32 || hex[12] !== "1") return null;

  try {
    const timeLow = BigInt(`0x${hex.slice(0, 8)}`);
    const timeMid = BigInt(`0x${hex.slice(8, 12)}`);
    const timeHi = BigInt(`0x${hex.slice(12, 16)}`) & 0x0fffn;
    const timestamp100ns = (timeHi << 48n) | (timeMid << 32n) | timeLow;
    return Number(timestamp100ns / 10000n - BigInt(UUID_EPOCH_UNIX_MS));
  } catch {
    return null;
  }
}

export function getMessageSortTime(message) {
  if (!message) return 0;

  const ms = Number(message.createdAtMs);
  if (!Number.isNaN(ms) && ms > 0) return ms;

  const fromUuid = getUuidV1TimestampMs(message.id);
  if (fromUuid != null && fromUuid > 0) return fromUuid;

  return 0;
}

export function normalizeMessage(message) {
  if (!message) return message;

  const sortTime = getMessageSortTime(message);
  if (sortTime > 0 && message.createdAtMs !== sortTime) {
    return { ...message, createdAtMs: sortTime };
  }

  return message;
}

function compareMessages(a, b) {
  const diff = getMessageSortTime(a) - getMessageSortTime(b);
  if (diff !== 0) return diff;

  const uuidDiff = (getUuidV1TimestampMs(a.id) ?? 0) - (getUuidV1TimestampMs(b.id) ?? 0);
  if (uuidDiff !== 0) return uuidDiff;

  return String(a.id).localeCompare(String(b.id));
}

export function sortMessages(messages = []) {
  return [...messages].map(normalizeMessage).sort(compareMessages);
}

export function mergeMessages(existing = [], incoming = []) {
  const merged = new Map();
  for (const message of existing) merged.set(message.id, normalizeMessage(message));
  for (const message of incoming) merged.set(message.id, normalizeMessage(message));
  return sortMessages(Array.from(merged.values()));
}

export function appendMessage(existing = [], message) {
  return mergeMessages(existing, [message]);
}

export function mergeWithServerMessages(existing = [], serverMessages = []) {
  return mergeMessages(existing, serverMessages);
}

export function isOwnMessage(message, userId, previousUserId = "") {
  if (!message || message.senderId === "system") return false;
  if (message.senderId === userId) return true;
  return Boolean(previousUserId && message.senderId === previousUserId);
}

export function remapMessagesForUserId(messagesByRoom, oldId, newId) {
  if (!oldId || oldId === newId) return messagesByRoom;

  const next = {};
  for (const [roomId, roomMessages] of Object.entries(messagesByRoom)) {
    next[roomId] = roomMessages.map((message) =>
      message.senderId === oldId
        ? { ...message, senderId: newId }
        : message
    );
  }
  return next;
}
