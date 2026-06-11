import pool from "../config/db.js";

export async function isRoomMember(userId, roomId) {
  if (!userId || !roomId) return false;

  const result = await pool.query(
    `SELECT 1 FROM chatroom_members WHERE room_id = $1 AND user_id = $2 LIMIT 1`,
    [roomId, userId]
  );

  return result.rows.length > 0;
}

export async function assertRoomMember(userId, roomId) {
  if (!(await isRoomMember(userId, roomId))) {
    throw new Error("Not a member of this room");
  }
}
