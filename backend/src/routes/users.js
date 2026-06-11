import { Router } from "express";
import pool from "../config/db.js";
import cassandraClient from "../config/cassandra.js";
import { authMiddleware, generateToken } from "../middleware/auth.js";
import { isUserOnline, migrateUserPresence } from "../config/presence.js";
import { errorsTotal } from "../metrics/prometheus.js";

const router = Router();
const ID_PATTERN = /^[a-zA-Z0-9._-]{3,64}$/;

router.get("/search", authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;

    if (!q || !q.trim()) {
      return res.json([]);
    }

    const keyword = `%${q.trim().toLowerCase()}%`;

    const result = await pool.query(
      `SELECT id, name, email, avatar_url, avatar_text
       FROM users
       WHERE id != $1
         AND (LOWER(id) LIKE $2 OR LOWER(name) LIKE $2 OR LOWER(email) LIKE $2)
       LIMIT 20`,
      [currentUserId, keyword]
    );

    const users = await Promise.all(
      result.rows.map(async (row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        avatarUrl: row.avatar_url,
        avatarText: row.avatar_text,
        online: await isUserOnline(row.id)
      }))
    );

    res.json(users);
  } catch (err) {
    console.error("User search error:", err);
    errorsTotal.labels("user_search").inc();
    res.status(500).json({ error: "Search failed" });
  }
});

router.patch("/me/id", authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id: newIdRaw } = req.body;
    const newId = String(newIdRaw || "").trim();
    const oldId = req.user.id;

    if (!ID_PATTERN.test(newId)) {
      return res.status(400).json({
        error: "ID must be 3-64 characters and use letters, numbers, ., _, or -"
      });
    }

    if (newId === oldId) {
      const current = await pool.query(
        `SELECT id, name, email, avatar_url, avatar_text FROM users WHERE id = $1`,
        [oldId]
      );
      const user = current.rows[0];
      return res.json({
        token: generateToken(user),
        user: formatUser(user)
      });
    }

    const taken = await pool.query(`SELECT 1 FROM users WHERE id = $1`, [newId]);
    if (taken.rows.length > 0) {
      return res.status(409).json({ error: "This ID is already taken" });
    }

    await client.query("BEGIN");

    const oldUserResult = await client.query(
      `SELECT id, google_sub, name, email, avatar_url, avatar_text, created_at
       FROM users WHERE id = $1`,
      [oldId]
    );

    if (oldUserResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }

    const oldUser = oldUserResult.rows[0];

    // Free unique email/google_sub on old row before inserting the new ID
    await client.query(
      `UPDATE users SET google_sub = NULL, email = NULL WHERE id = $1`,
      [oldId]
    );

    await client.query(
      `INSERT INTO users (id, google_sub, name, email, avatar_url, avatar_text, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        newId,
        oldUser.google_sub,
        oldUser.name,
        oldUser.email,
        oldUser.avatar_url,
        oldUser.avatar_text,
        oldUser.created_at
      ]
    );

    await client.query(
      `UPDATE chatroom_members SET user_id = $1 WHERE user_id = $2`,
      [newId, oldId]
    );

    await client.query(
      `UPDATE chatrooms SET created_by = $1 WHERE created_by = $2`,
      [newId, oldId]
    );

    const roomRows = await client.query(
      `SELECT room_id FROM chatroom_members WHERE user_id = $1`,
      [newId]
    );

    for (const row of roomRows.rows) {
      const messages = await cassandraClient.execute(
        `SELECT room_id, created_at, message_id, sender_id
         FROM messages WHERE room_id = ?`,
        [row.room_id],
        { prepare: true }
      );

      for (const message of messages.rows) {
        if (message.sender_id !== oldId) continue;

        await cassandraClient.execute(
          `UPDATE messages SET sender_id = ? WHERE room_id = ? AND created_at = ? AND message_id = ?`,
          [newId, message.room_id, message.created_at, message.message_id],
          { prepare: true }
        );
      }
    }

    await client.query(`DELETE FROM users WHERE id = $1`, [oldId]);
    await client.query("COMMIT");

    await migrateUserPresence(oldId, newId);

    const updatedUser = {
      id: newId,
      name: oldUser.name,
      email: oldUser.email,
      avatar_url: oldUser.avatar_url,
      avatar_text: oldUser.avatar_text
    };

    res.json({
      token: generateToken(updatedUser),
      user: formatUser(updatedUser)
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // transaction may already be rolled back
    }
    console.error("Update user ID error:", err);

    if (err.code === "23505") {
      return res.status(409).json({ error: "This ID or email is already taken" });
    }

    errorsTotal.labels("user_update_id").inc();
    res.status(500).json({ error: "Failed to update user ID" });
  } finally {
    client.release();
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, avatar_url, avatar_text FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = result.rows[0];

    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url,
      avatarText: row.avatar_text,
      online: await isUserOnline(row.id)
    });
  } catch (err) {
    console.error("Get user error:", err);
    errorsTotal.labels("user_get").inc();
    res.status(500).json({ error: "Failed to get user" });
  }
});

function formatUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    avatarText: row.avatar_text
  };
}

export default router;
