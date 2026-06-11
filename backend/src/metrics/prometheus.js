import client from "prom-client";

const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register]
});

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

export const wsConnectionsActive = new client.Gauge({
  name: "websocket_connections_active",
  help: "Number of active WebSocket connections",
  registers: [register]
});

export const usersOnlineTotal = new client.Gauge({
  name: "users_online_total",
  help: "Number of users currently online",
  registers: [register]
});

export const messagesSentTotal = new client.Counter({
  name: "messages_sent_total",
  help: "Rate counter for newly sent messages (since pod start)",
  registers: [register]
});

export const messagesStoredTotal = new client.Gauge({
  name: "messages_stored_total",
  help: "Total messages stored across all chatrooms and history (Cassandra)",
  registers: [register]
});

export const errorsTotal = new client.Counter({
  name: "errors_total",
  help: "Total number of application errors",
  labelNames: ["type"],
  registers: [register]
});

export const pageLoadDuration = new client.Histogram({
  name: "page_load_duration_seconds",
  help: "Frontend page load duration in seconds",
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [register]
});

export { register };
