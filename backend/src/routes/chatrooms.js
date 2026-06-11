import { Router } from "express";
import pool from "../config/db.js";
import { isUserOnline } from "../config/presence.js";
import { authMiddleware } from "../middleware/auth.js";
import { errorsTotal } from "../metrics/prometheus.js";
import { formatTime } from "../utils/time.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT c.id, c.type, c.name, c.last_message, c.updated_at, c.created_by
       FROM chatrooms c
       INNER JOIN chatroom_members cm ON c.id = cm.room_id
       WHERE cm.user_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    const rooms = await Promise.all(
      result.rows.map(async (room) => {
        const members = await getRoomMembers(room.id);
        const onlineUsers = await getOnlineUsersInRoom(members);

        let directUserId = "";
        if (room.type === "direct") {
          const other = members.find((m) => m.id !== userId);
          directUserId = other?.id || "";
        }

        return {
          id: room.id,
          type: room.type,
          userId: directUserId || room.id,
          name: room.type === "direct"
            ? members.find((m) => m.id !== userId)?.name || room.name
            : room.name,
          members: members.map((m) => m.id),
          memberProfiles: members.filter((m) => m.id !== userId),
          onlineUsers,
          lastMessage: room.last_message || "",
          updatedAt: formatTime(room.updated_at)
        };
      })
    );

    res.json(rooms);
  } catch (err) {
    console.error("Get chatrooms error:", err);
    errorsTotal.labels("chatrooms_list").inc();
    res.status(500).json({ error: "Failed to get chatrooms" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const { type, name, targetUserId, memberIds } = req.body;
    const currentUserId = req.user.id;

    await client.query("BEGIN");

    if (type === "direct") {
      if (!targetUserId) {
        return res.status(400).json({ error: "targetUserId is required for direct rooms" });
      }

      const existing = await client.query(
        `SELECT c.id FROM chatrooms c
         INNER JOIN chatroom_members cm1 ON c.id = cm1.room_id AND cm1.user_id = $1
         INNER JOIN chatroom_members cm2 ON c.id = cm2.room_id AND cm2.user_id = $2
         WHERE c.type = 'direct'
         LIMIT 1`,
        [currentUserId, targetUserId]
      );

      if (existing.rows.length > 0) {
        await client.query("ROLLBACK");
        const roomId = existing.rows[0].id;
        const members = await getRoomMembers(roomId);
        const onlineUsers = await getOnlineUsersInRoom(members);
        return res.json({
          id: roomId,
          type: "direct",
          userId: targetUserId,
          name: name || targetUserId,
          members: members.map((m) => m.id),
          memberProfiles: members.filter((m) => m.id !== currentUserId),
          onlineUsers,
          lastMessage: "",
          updatedAt: formatTime(new Date())
        });
      }

      const roomId = `room-${targetUserId}-${Date.now()}`;
      const roomName = name || targetUserId;

      await client.query(
        `INSERT INTO chatrooms (id, type, name, created_by, last_message) VALUES ($1, 'direct', $2, $3, $4)`,
        [roomId, roomName, currentUserId, "聊天室已建立"]
      );

      await client.query(
        `INSERT INTO chatroom_members (room_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [roomId, currentUserId, targetUserId]
      );

      await client.query("COMMIT");

      const members = await getRoomMembers(roomId);
      const onlineUsers = await getOnlineUsersInRoom(members);

      res.status(201).json({
        id: roomId,
        type: "direct",
        userId: targetUserId,
        name: roomName,
        members: members.map((m) => m.id),
        memberProfiles: members.filter((m) => m.id !== currentUserId),
        onlineUsers,
        lastMessage: "聊天室已建立",
        updatedAt: formatTime(new Date())
      });
    } else if (type === "group") {
      if (!name || !memberIds || memberIds.length === 0) {
        return res.status(400).json({ error: "name and memberIds are required for group rooms" });
      }

      const roomId = `group-${Date.now()}`;
      const allMemberIds = [currentUserId, ...memberIds];

      await client.query(
        `INSERT INTO chatrooms (id, type, name, created_by, last_message) VALUES ($1, 'group', $2, $3, $4)`,
        [roomId, name, currentUserId, "群組聊天室已建立"]
      );

      const memberValues = allMemberIds
        .map((_, i) => `($1, $${i + 2})`)
        .join(", ");

      await client.query(
        `INSERT INTO chatroom_members (room_id, user_id) VALUES ${memberValues}`,
        [roomId, ...allMemberIds]
      );

      await client.query("COMMIT");

      const members = await getRoomMembers(roomId);
      const onlineUsers = await getOnlineUsersInRoom(members);

      res.status(201).json({
        id: roomId,
        type: "group",
        userId: roomId,
        name,
        members: allMemberIds,
        memberProfiles: members.filter((m) => m.id !== currentUserId),
        onlineUsers,
        lastMessage: "群組聊天室已建立",
        updatedAt: formatTime(new Date())
      });
    } else {
      res.status(400).json({ error: "Invalid room type" });
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create chatroom error:", err);
    errorsTotal.labels("chatroom_create").inc();
    res.status(500).json({ error: "Failed to create chatroom" });
  } finally {
    client.release();
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const membership = await pool.query(
      `SELECT 1 FROM chatroom_members WHERE room_id = $1 AND user_id = $2`,
      [roomId, userId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: "Not a member of this room" });
    }

    await pool.query(`DELETE FROM chatroom_members WHERE room_id = $1 AND user_id = $2`, [roomId, userId]);

    const remaining = await pool.query(
      `SELECT COUNT(*) as count FROM chatroom_members WHERE room_id = $1`,
      [roomId]
    );

    if (parseInt(remaining.rows[0].count) === 0) {
      await pool.query(`DELETE FROM chatrooms WHERE id = $1`, [roomId]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete room error:", err);
    errorsTotal.labels("chatroom_delete").inc();
    res.status(500).json({ error: "Failed to delete room" });
  }
});

async function getRoomMembers(roomId) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar_url, u.avatar_text
     FROM users u
     INNER JOIN chatroom_members cm ON u.id = cm.user_id
     WHERE cm.room_id = $1`,
    [roomId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    avatarText: row.avatar_text
  }));
}

async function getOnlineUsersInRoom(members) {
  try {
    const memberIds = members.map((m) => m.id);
    const checks = await Promise.all(
      memberIds.map(async (id) => [id, await isUserOnline(id)])
    );
    return checks.filter(([, online]) => online).map(([id]) => id);
  } catch (err) {
    console.debug("Room online status lookup failed:", err.message);
    return [];
  }
}

export default router;
