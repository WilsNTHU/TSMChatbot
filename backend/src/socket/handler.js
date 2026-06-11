import pool from "../config/db.js";
import { verifyToken } from "../middleware/auth.js";
import { broadcastNewMessage } from "./broadcast.js";
import {
  registerSocket,
  markSocketActive,
  markSocketIdle,
  heartbeatSocket,
  unregisterSocket,
  pruneAllStalePresence,
  trackSocketConnected,
  trackSocketDisconnected,
  touchSocketHeartbeat
} from "../config/presence.js";
import { syncClusterMetrics } from "../utils/metricsSync.js";
import { formatTime } from "../utils/time.js";
import { isRoomMember } from "../utils/roomAccess.js";

async function joinAllUserRooms(socket, userId) {
  try {
    const result = await pool.query(
      `SELECT room_id FROM chatroom_members WHERE user_id = $1`,
      [userId]
    );

    for (const row of result.rows) {
      socket.join(row.room_id);
    }
  } catch (err) {
    console.error("Auto join rooms error:", err.message);
  }
}

export function setupSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const user = verifyToken(token);
      socket.user = user;
      next();
    } catch (err) {
      console.debug("Socket auth failed:", err.message);
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user.id;
    const userName = socket.user.name;

    console.log(`User connected: ${userId} (${userName})`);

    try {
      await registerSocket(userId, socket.id);
      await trackSocketConnected();
      await joinAllUserRooms(socket, userId);
      await syncClusterMetrics();
    } catch (err) {
      console.error("Redis socket registration error:", err.message);
    }

    socket.onAny(async () => {
      try {
        await touchSocketHeartbeat(socket.id);
      } catch (err) {
        console.debug("Socket heartbeat refresh failed:", err.message);
      }
    });

    socket.on("presence_active", async () => {
      try {
        const becameOnline = await markSocketActive(userId, socket.id);
        await syncClusterMetrics();

        if (becameOnline) {
          io.emit("user_online", { userId, userName });
        }
      } catch (err) {
        console.error("Presence active error:", err.message);
      }
    });

    socket.on("presence_idle", async () => {
      try {
        const becameOffline = await markSocketIdle(userId, socket.id);
        await syncClusterMetrics();

        if (becameOffline) {
          io.emit("user_offline", { userId });
        }
      } catch (err) {
        console.error("Presence idle error:", err.message);
      }
    });

    socket.on("presence_heartbeat", async () => {
      try {
        const becameOnline = await heartbeatSocket(userId, socket.id);
        await syncClusterMetrics();

        if (becameOnline) {
          io.emit("user_online", { userId, userName });
        }
      } catch (err) {
        console.error("Presence heartbeat error:", err.message);
      }
    });

    socket.on("join_room", async (roomId) => {
      if (!(await isRoomMember(userId, roomId))) return;
      socket.join(roomId);
    });

    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
      console.log(`${userId} left room ${roomId}`);
    });

    socket.on("send_message", async (data) => {
      const { roomId, message } = data;
      if (!roomId || !message) return;
      if (!(await isRoomMember(userId, roomId))) return;

      const sentAtMs = Number(message.createdAtMs) > 0 ? Number(message.createdAtMs) : Date.now();
      const sentAt = message.createdAt || formatTime(new Date(sentAtMs));

      broadcastNewMessage(roomId, {
        ...message,
        senderId: userId,
        senderName: userName,
        createdAt: sentAt,
        createdAtMs: sentAtMs
      });
    });

    socket.on("typing", (data) => {
      socket.to(data.roomId).emit("user_typing", {
        roomId: data.roomId,
        userId,
        userName
      });
    });

    socket.on("stop_typing", (data) => {
      socket.to(data.roomId).emit("user_stop_typing", {
        roomId: data.roomId,
        userId
      });
    });

    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${userId}`);

      try {
        const becameOffline = await unregisterSocket(userId, socket.id);
        await trackSocketDisconnected();
        await syncClusterMetrics();

        if (becameOffline) {
          io.emit("user_offline", { userId });
        }
      } catch (err) {
        console.error("Redis offline tracking error:", err.message);
      }
    });
  });

  const PRESENCE_SWEEP_MS = 15_000;

  setInterval(async () => {
    try {
      const wentOffline = await pruneAllStalePresence();
      await syncClusterMetrics();

      for (const userId of wentOffline) {
        io.emit("user_offline", { userId });
      }
    } catch (err) {
      console.error("Presence sweep error:", err.message);
    }
  }, PRESENCE_SWEEP_MS);
}
