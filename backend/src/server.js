import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

import { initPostgres } from "./config/db.js";
import { initCassandra } from "./config/cassandra.js";
import { initRedis } from "./config/redis.js";
import { setIO } from "./socket/io.js";

import { metricsMiddleware } from "./middleware/metrics.js";
import { register, pageLoadDuration } from "./metrics/prometheus.js";
import { syncClusterMetrics } from "./utils/metricsSync.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import chatroomRoutes from "./routes/chatrooms.js";
import messageRoutes from "./routes/messages.js";
import adminRoutes from "./routes/admin.js";
import agentRoutes from "./routes/agent.js";
import { createAlertsRouter } from "./routes/alerts.js";

import { setupSocketHandlers } from "./socket/handler.js";
import { ingestAlertWebhook } from "./utils/alertIngest.js";

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

setIO(io);

function setupSocketRedisAdapter() {
  try {
    const redisOptions = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null
    };

    const pubClient = new Redis(redisOptions);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Socket.IO Redis adapter enabled");
  } catch (err) {
    console.error("Socket.IO Redis adapter failed:", err.message);
  }
}

setupSocketRedisAdapter();

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(metricsMiddleware);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/metrics", async (_req, res) => {
  try {
    await syncClusterMetrics();

    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

app.post("/api/metrics/page-load", (req, res) => {
  const raw = req.body?.duration;
  const durationMs =
    typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : 1;
  pageLoadDuration.observe(durationMs / 1000);
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chatrooms", chatroomRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/agent", agentRoutes);

const alertHistory = [];

app.use(
  "/api/alerts",
  createAlertsRouter({
    getHistory: () => alertHistory,
    onWebhook: (payload) => ingestAlertWebhook(payload, alertHistory, io)
  })
);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

setupSocketHandlers(io);

const PORT = parseInt(process.env.PORT || "3000");

async function start() {
  await Promise.allSettled([
    initPostgres(),
    initCassandra(),
    initRedis()
  ]);

  server.listen(PORT, () => {
    console.log(`TSMChat backend running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Metrics: http://localhost:${PORT}/metrics`);
  });
}

start();
