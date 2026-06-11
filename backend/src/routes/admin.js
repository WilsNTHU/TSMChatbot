import { Router } from "express";
import pool from "../config/db.js";
import cassandraClient from "../config/cassandra.js";
import { authMiddleware } from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/admin.js";
import { removeUserPresence, getActiveOnlineUserIds } from "../config/presence.js";
import { getClusterMetricsSummary } from "../utils/metricsSync.js";
import { isAdminUser } from "../config/admin.js";

const router = Router();

router.get("/check", authMiddleware, (req, res) => {
  res.json({ isAdmin: isAdminUser(req.user.email) });
});

router.get("/dashboard", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [users, chatrooms, onlineUserIds, metrics] = await Promise.all([
      getAllUsers(),
      getAllChatrooms(),
      getActiveOnlineUserIds(),
      getClusterMetricsSummary()
    ]);

    const recentMessages = await getRecentMessages();

    const onlineSet = new Set(onlineUserIds);
    const enrichedUsers = users.map((u) => ({
      ...u,
      online: onlineSet.has(u.id)
    }));

    res.json({
      overview: {
        totalUsers: users.length,
        onlineUsers: onlineUserIds.length,
        totalChatrooms: chatrooms.length,
        totalMessages: recentMessages.totalCount
      },
      users: enrichedUsers,
      chatrooms,
      recentMessages: recentMessages.messages,
      onlineUserIds,
      metrics
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.status(500).json({ error: "Failed to load admin dashboard" });
  }
});

async function getAllUsers() {
  const result = await pool.query(
    `SELECT id, name, email, avatar_url, avatar_text, created_at
     FROM users ORDER BY created_at DESC`
  );
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    avatarUrl: r.avatar_url,
    avatarText: r.avatar_text,
    createdAt: r.created_at
  }));
}

async function getAllChatrooms() {
  const onlineSet = new Set(await getActiveOnlineUserIds());

  const result = await pool.query(
    `SELECT c.id, c.type, c.name, c.last_message, c.created_by, c.created_at, c.updated_at,
            COUNT(cm.user_id) AS member_count
     FROM chatrooms c
     LEFT JOIN chatroom_members cm ON c.id = cm.room_id
     GROUP BY c.id
     ORDER BY c.updated_at DESC`
  );

  const rooms = [];
  for (const r of result.rows) {
    const membersResult = await pool.query(
      `SELECT u.id, u.name FROM users u
       INNER JOIN chatroom_members cm ON u.id = cm.user_id
       WHERE cm.room_id = $1`,
      [r.id]
    );

    rooms.push({
      id: r.id,
      type: r.type,
      name: r.name,
      lastMessage: r.last_message,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      memberCount: parseInt(r.member_count),
      members: membersResult.rows.map((m) => ({ id: m.id, name: m.name })),
      onlineCount: membersResult.rows.filter((m) => onlineSet.has(m.id)).length
    });
  }

  return rooms;
}

async function getRecentMessages() {
  try {
    const countResult = await cassandraClient.execute(
      `SELECT COUNT(*) AS total FROM messages`
    );
    const totalCount = countResult.rows[0]?.total?.low ?? countResult.rows[0]?.total ?? 0;

    const roomsResult = await pool.query(`SELECT id, name FROM chatrooms`);
    const roomMap = {};
    for (const r of roomsResult.rows) {
      roomMap[r.id] = r.name;
    }

    let allMessages = [];
    for (const roomId of Object.keys(roomMap)) {
      const msgResult = await cassandraClient.execute(
        `SELECT message_id, room_id, sender_id, sender_name, text, created_at
         FROM messages WHERE room_id = ? ORDER BY created_at DESC, message_id DESC LIMIT 10`,
        [roomId],
        { prepare: true }
      );
      for (const row of msgResult.rows) {
        allMessages.push({
          id: row.message_id?.toString(),
          roomId: row.room_id,
          roomName: roomMap[row.room_id] || row.room_id,
          senderId: row.sender_id,
          senderName: row.sender_name,
          text: row.text,
          createdAt: row.created_at
        });
      }
    }

    allMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    allMessages = allMessages.slice(0, 50);

    return { messages: allMessages, totalCount: Number(totalCount) };
  } catch (err) {
    console.error("Failed to fetch messages for admin:", err);
    return { messages: [], totalCount: 0 };
  }
}

router.delete("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const userId = req.params.id;

  if (userId === req.user.id) {
    return res.status(400).json({ error: "Cannot delete yourself" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const roomIds = await client.query(
      `SELECT room_id FROM chatroom_members WHERE user_id = $1`, [userId]
    );

    await client.query(`DELETE FROM chatroom_members WHERE user_id = $1`, [userId]);

    for (const row of roomIds.rows) {
      const remaining = await client.query(
        `SELECT COUNT(*) as count FROM chatroom_members WHERE room_id = $1`, [row.room_id]
      );
      if (parseInt(remaining.rows[0].count) === 0) {
        await client.query(`DELETE FROM chatrooms WHERE id = $1`, [row.room_id]);
        try {
          await cassandraClient.execute(
            `DELETE FROM messages WHERE room_id = ?`, [row.room_id], { prepare: true }
          );
        } catch (err) {
          console.warn(`Cassandra cleanup failed for room ${row.room_id}:`, err.message);
        }
      }
    }

    await client.query(`UPDATE chatrooms SET created_by = NULL WHERE created_by = $1`, [userId]);
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await client.query("COMMIT");

    try {
      await removeUserPresence(userId);
    } catch (err) {
      console.warn(`Presence cleanup failed for user ${userId}:`, err.message);
    }

    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Admin delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  } finally {
    client.release();
  }
});

router.delete("/messages/:roomId", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;

    await cassandraClient.execute(
      `DELETE FROM messages WHERE room_id = ?`, [roomId], { prepare: true }
    );

    await pool.query(
      `UPDATE chatrooms SET last_message = $1, updated_at = NOW() WHERE id = $2`,
      ["Messages cleared by admin", roomId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Admin delete messages error:", err);
    res.status(500).json({ error: "Failed to delete messages" });
  }
});

router.delete("/messages", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const roomsResult = await pool.query(`SELECT id FROM chatrooms`);

    for (const row of roomsResult.rows) {
      try {
        await cassandraClient.execute(
          `DELETE FROM messages WHERE room_id = ?`, [row.id], { prepare: true }
        );
      } catch (err) {
        console.warn(`Cassandra cleanup failed for room ${row.id}:`, err.message);
      }
    }

    await pool.query(
      `UPDATE chatrooms SET last_message = 'Messages cleared by admin', updated_at = NOW()`
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Admin clear all messages error:", err);
    res.status(500).json({ error: "Failed to clear all messages" });
  }
});

async function getMetricsSummary() {
  return getClusterMetricsSummary();
}

export default router;
