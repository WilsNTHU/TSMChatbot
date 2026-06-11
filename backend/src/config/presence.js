import redis from "./redis.js";

const HEARTBEAT_TTL_SEC = 45;

function socketKey(userId) {
  return `user_sockets:${userId}`;
}

function activeSocketKey(userId) {
  return `user_active_sockets:${userId}`;
}

function heartbeatKey(socketId) {
  return `socket_hb:${socketId}`;
}

async function refreshHeartbeat(socketId) {
  await redis.set(heartbeatKey(socketId), "1", "EX", HEARTBEAT_TTL_SEC);
}

async function clearHeartbeat(socketId) {
  await redis.del(heartbeatKey(socketId));
}

async function isHeartbeatAlive(socketId) {
  return (await redis.exists(heartbeatKey(socketId))) === 1;
}

export async function pruneStaleActiveSockets(userId) {
  const activeSockets = await redis.smembers(activeSocketKey(userId));
  if (activeSockets.length === 0) return false;

  const stale = [];
  for (const socketId of activeSockets) {
    if (!(await isHeartbeatAlive(socketId))) {
      stale.push(socketId);
    }
  }

  if (stale.length === 0) return false;

  await redis.srem(activeSocketKey(userId), ...stale);

  const remaining = await redis.scard(activeSocketKey(userId));
  if (remaining === 0) {
    await redis.srem("online_users", userId);
    await redis.del(activeSocketKey(userId));
    return true;
  }

  return false;
}

export async function pruneAllStalePresence() {
  const userIds = await redis.smembers("online_users");
  const wentOffline = [];

  for (const userId of userIds) {
    if (await pruneStaleActiveSockets(userId)) {
      wentOffline.push(userId);
    }
  }

  return wentOffline;
}

const WS_CONNECTIONS_KEY = "metrics:ws_connections";

export async function registerSocket(userId, socketId) {
  await redis.sadd(socketKey(userId), socketId);
  await refreshHeartbeat(socketId);
}

export async function touchSocketHeartbeat(socketId) {
  const alive = await isHeartbeatAlive(socketId);
  if (alive) {
    await refreshHeartbeat(socketId);
  }
}

export async function trackSocketConnected() {
  await redis.incr(WS_CONNECTIONS_KEY);
}

export async function trackSocketDisconnected() {
  const count = await redis.decr(WS_CONNECTIONS_KEY);
  if (count < 0) {
    await redis.set(WS_CONNECTIONS_KEY, "0");
  }
}

export async function pruneStaleRegisteredSockets() {
  let cursor = "0";
  let removed = 0;

  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", "user_sockets:*", "COUNT", 100);
    cursor = next;

    for (const key of keys) {
      const userId = key.slice("user_sockets:".length);
      const socketIds = await redis.smembers(key);

      for (const socketId of socketIds) {
        if (await isHeartbeatAlive(socketId)) continue;

        const removedFromSet = await redis.srem(key, socketId);
        if (removedFromSet === 0) continue;

        await redis.srem(activeSocketKey(userId), socketId);
        await clearHeartbeat(socketId);
        removed += 1;
      }

      if ((await redis.scard(key)) === 0) {
        await redis.del(key);
      }

      const activeRemaining = await redis.scard(activeSocketKey(userId));
      if (activeRemaining === 0) {
        await redis.srem("online_users", userId);
        await redis.del(activeSocketKey(userId));
      }
    }
  } while (cursor !== "0");

  if (removed > 0) {
    const count = await redis.decrby(WS_CONNECTIONS_KEY, removed);
    if (count < 0) {
      await redis.set(WS_CONNECTIONS_KEY, "0");
    }
  }

  return removed;
}

export async function markSocketActive(userId, socketId) {
  await redis.sadd(socketKey(userId), socketId);
  await refreshHeartbeat(socketId);

  const before = await redis.scard(activeSocketKey(userId));
  await redis.sadd(activeSocketKey(userId), socketId);
  await redis.sadd("online_users", userId);

  return before === 0;
}

export async function heartbeatSocket(userId, socketId) {
  await redis.sadd(socketKey(userId), socketId);

  const isActive = await redis.sismember(activeSocketKey(userId), socketId);
  await refreshHeartbeat(socketId);

  if (isActive) {
    return false;
  }

  const before = await redis.scard(activeSocketKey(userId));
  await redis.sadd(activeSocketKey(userId), socketId);
  await redis.sadd("online_users", userId);

  return before === 0;
}

export async function markSocketIdle(userId, socketId) {
  await redis.srem(activeSocketKey(userId), socketId);

  const remaining = await redis.scard(activeSocketKey(userId));
  if (remaining === 0) {
    await redis.srem("online_users", userId);
    await redis.del(activeSocketKey(userId));
    return true;
  }

  return false;
}

export async function unregisterSocket(userId, socketId) {
  await redis.srem(socketKey(userId), socketId);
  await redis.srem(activeSocketKey(userId), socketId);
  await clearHeartbeat(socketId);

  const activeRemaining = await redis.scard(activeSocketKey(userId));
  if (activeRemaining === 0) {
    await redis.srem("online_users", userId);
    await redis.del(activeSocketKey(userId));
  }

  const socketRemaining = await redis.scard(socketKey(userId));
  if (socketRemaining === 0) {
    await redis.del(socketKey(userId));
  }

  return activeRemaining === 0;
}

async function countRegisteredSockets() {
  let cursor = "0";
  let total = 0;

  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", "user_sockets:*", "COUNT", 100);
    cursor = next;
    for (const key of keys) {
      total += await redis.scard(key);
    }
  } while (cursor !== "0");

  return total;
}

export async function reconcileConnectionCounter() {
  await pruneStaleRegisteredSockets();
  const registered = await countRegisteredSockets();
  const counter = parseInt(await redis.get(WS_CONNECTIONS_KEY) || "0", 10);
  const accurate = Math.max(registered, 0);

  if (counter !== accurate) {
    await redis.set(WS_CONNECTIONS_KEY, String(accurate));
  }

  return accurate;
}

export async function isUserOnline(userId) {
  try {
    await pruneStaleActiveSockets(userId);
    const count = await redis.scard(activeSocketKey(userId));
    return count > 0;
  } catch (err) {
    console.debug("Online check failed:", err.message);
    return false;
  }
}

export async function getActiveOnlineUserIds() {
  try {
    const userIds = await redis.smembers("online_users");
    if (userIds.length === 0) return [];

    const results = await Promise.all(
      userIds.map(async (userId) => {
        await pruneStaleActiveSockets(userId);
        const count = await redis.scard(activeSocketKey(userId));
        return count > 0 ? userId : null;
      })
    );

    const activeIds = results.filter(Boolean);
    const staleIds = userIds.filter((id) => !activeIds.includes(id));

    if (staleIds.length > 0) {
      await redis.srem("online_users", ...staleIds);
    }

    return activeIds;
  } catch (err) {
    console.debug("Active online users lookup failed:", err.message);
    return [];
  }
}

export async function syncOnlineUsersMetric() {
  const activeIds = await getActiveOnlineUserIds();
  return activeIds.length;
}

export async function migrateUserPresence(oldUserId, newUserId) {
  const oldSocketKey = socketKey(oldUserId);
  const oldActiveKey = activeSocketKey(oldUserId);
  const socketIds = await redis.smembers(oldSocketKey);
  const activeSocketIds = await redis.smembers(oldActiveKey);

  if (socketIds.length === 0 && activeSocketIds.length === 0) return;

  const newSocketKey = socketKey(newUserId);
  const newActiveKey = activeSocketKey(newUserId);

  if (socketIds.length > 0) {
    await redis.sadd(newSocketKey, ...socketIds);
  }

  if (activeSocketIds.length > 0) {
    await redis.sadd(newActiveKey, ...activeSocketIds);
    await redis.sadd("online_users", newUserId);

    for (const socketId of activeSocketIds) {
      await refreshHeartbeat(socketId);
    }
  }

  await redis.del(oldSocketKey);
  await redis.del(oldActiveKey);
  await redis.srem("online_users", oldUserId);
}

export async function removeUserPresence(userId) {
  const socketIds = await redis.smembers(socketKey(userId));
  const activeSocketIds = await redis.smembers(activeSocketKey(userId));

  for (const socketId of new Set([...socketIds, ...activeSocketIds])) {
    await clearHeartbeat(socketId);
  }

  await redis.del(socketKey(userId));
  await redis.del(activeSocketKey(userId));
  await redis.srem("online_users", userId);
}
