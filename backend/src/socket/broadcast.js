import { getIO } from "./io.js";
import { formatTime } from "../utils/time.js";

export function broadcastNewMessage(roomId, message) {
  const io = getIO();
  if (!io) return;

  io.to(roomId).emit("new_message", { roomId, message });
  io.to(roomId).emit("room_updated", {
    roomId,
    lastMessage: message.text,
    updatedAt: message.createdAt || formatTime(new Date())
  });
}
