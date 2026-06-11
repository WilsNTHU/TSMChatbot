import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/admin.js";
import { filterVisibleAlerts } from "../utils/alerts.js";

function verifyWebhookSecret(req) {
  const secret = process.env.ALERT_WEBHOOK_SECRET;

  if (process.env.NODE_ENV === "production" && !secret) {
    return { ok: false, status: 503, error: "Alert webhook is not configured" };
  }

  if (!secret) return { ok: true };

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (token !== secret) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}

export function createAlertsRouter({ getHistory, onWebhook }) {
  const router = Router();

  router.post("/webhook", async (req, res) => {
    const auth = verifyWebhookSecret(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    try {
      await onWebhook(req.body);
      res.json({ ok: true });
    } catch (err) {
      console.error("Alert webhook error:", err.message);
      res.status(500).json({ error: "Failed to process alert webhook" });
    }
  });

  router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
    const visibleAlerts = await filterVisibleAlerts(getHistory());
    res.json(visibleAlerts);
  });

  return router;
}
