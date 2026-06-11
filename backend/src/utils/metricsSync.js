import cassandraClient from "../config/cassandra.js";
import {
  syncOnlineUsersMetric,
  reconcileConnectionCounter
} from "../config/presence.js";
import {
  usersOnlineTotal,
  wsConnectionsActive,
  messagesStoredTotal
} from "../metrics/prometheus.js";

const MESSAGE_COUNT_CACHE_MS = 15_000;
let cachedMessageTotal = 0;
let cachedMessageAt = 0;

export function invalidateMessageCountCache() {
  cachedMessageAt = 0;
}

export async function getTotalStoredMessages() {
  const now = Date.now();
  if (cachedMessageAt > 0 && now - cachedMessageAt < MESSAGE_COUNT_CACHE_MS) {
    return cachedMessageTotal;
  }

  try {
    const result = await cassandraClient.execute(
      `SELECT COUNT(*) AS total FROM messages`
    );
    cachedMessageTotal = Number(
      result.rows[0]?.total?.low ?? result.rows[0]?.total ?? 0
    );
    cachedMessageAt = now;
    return cachedMessageTotal;
  } catch (err) {
    console.error("Message count query error:", err.message);
    return cachedMessageTotal;
  }
}

export async function getClusterSocketCount() {
  try {
    return await reconcileConnectionCounter();
  } catch (err) {
    console.debug("Socket count reconcile failed:", err.message);
    return 0;
  }
}

export async function syncClusterMetrics() {
  const [onlineUsers, liveConnections, totalMessages] = await Promise.all([
    syncOnlineUsersMetric(),
    getClusterSocketCount(),
    getTotalStoredMessages()
  ]);

  usersOnlineTotal.set(onlineUsers);
  wsConnectionsActive.set(liveConnections);
  messagesStoredTotal.set(totalMessages);

  return { onlineUsers, liveConnections, totalMessages };
}

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://prometheus:9090";

export async function queryPrometheusScalar(expr) {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(expr)}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Prometheus query failed: ${res.status}`);
  }

  const body = await res.json();
  if (body.status !== "success") {
    throw new Error("Prometheus query unsuccessful");
  }

  const value = body.data?.result?.[0]?.value?.[1];
  return value != null ? parseFloat(value) : 0;
}

export async function getClusterMetricsSummary() {
  const { onlineUsers, liveConnections, totalMessages } = await syncClusterMetrics();

  try {
    const [httpRequestsTotal, errorsTotal, uptimeSeconds] = await Promise.all([
      queryPrometheusScalar('sum(http_requests_total{route!="/health",route!="/metrics"})'),
      queryPrometheusScalar(
        'count(ALERTS{alertstate="firing", alertname=~"BackendDown|HighErrorRate|HighLatencyP95|HighLatencyP99|SlowPageLoad"}) or vector(0)'
      ),
      queryPrometheusScalar('max(time() - process_start_time_seconds{job="backend"})')
    ]);

    return {
      usersOnlineTotal: onlineUsers,
      wsConnectionsActive: liveConnections,
      httpRequestsTotal,
      messagesSentTotal: totalMessages,
      errorsTotal,
      uptimeSeconds: Math.floor(uptimeSeconds)
    };
  } catch (err) {
    console.error("Prometheus summary fallback:", err.message);
    return {
      usersOnlineTotal: onlineUsers,
      wsConnectionsActive: liveConnections,
      httpRequestsTotal: 0,
      messagesSentTotal: totalMessages,
      errorsTotal: 0,
      uptimeSeconds: 0
    };
  }
}
