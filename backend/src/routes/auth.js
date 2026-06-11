import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import pool from "../config/db.js";
import { generateToken } from "../middleware/auth.js";
import { errorsTotal } from "../metrics/prometheus.js";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const googleSub = payload.sub;
    const email = payload.email || "";
    const name = payload.name || "Google User";
    const avatarUrl = payload.picture || "";
    const defaultId = email ? email.split("@")[0] : googleSub;
    const avatarText = name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const upsertQuery = `
      INSERT INTO users (id, google_sub, name, email, avatar_url, avatar_text, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (google_sub) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        avatar_url = EXCLUDED.avatar_url,
        avatar_text = EXCLUDED.avatar_text,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(upsertQuery, [
      defaultId, googleSub, name, email, avatarUrl, avatarText
    ]);

    const user = result.rows[0];

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url,
        avatarText: user.avatar_text
      }
    });
  } catch (err) {
    console.error("Auth error:", err);
    errorsTotal.labels("auth").inc();
    res.status(500).json({ error: "Authentication failed" });
  }
});

export default router;
