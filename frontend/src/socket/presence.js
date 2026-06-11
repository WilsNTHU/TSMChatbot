const HEARTBEAT_MS = 20_000;
const PRESENCE_BOOTSTRAP_MS = 2_000;
const PRESENCE_BOOTSTRAP_ATTEMPTS = 6;

function isActivelyViewing() {
  return document.visibilityState === "visible";
}

export function setupPresenceTracking(socket) {
  if (!socket) return () => {};

  let lastState = null;
  let heartbeatTimer = null;
  let bootstrapTimer = null;

  const stopBootstrap = () => {
    if (bootstrapTimer) {
      clearInterval(bootstrapTimer);
      bootstrapTimer = null;
    }
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (!socket.connected || !isActivelyViewing()) return;
      socket.emit("presence_heartbeat");
    }, HEARTBEAT_MS);
  };

  const markActive = () => {
    if (!socket.connected) return;
    socket.emit("presence_active");
    startHeartbeat();
  };

  const markIdle = () => {
    if (!socket.connected) return;
    stopHeartbeat();
    socket.emit("presence_idle");
  };

  const syncPresence = () => {
    if (!socket.connected) return;

    const shouldBeActive = isActivelyViewing();
    if (shouldBeActive === lastState) return;

    lastState = shouldBeActive;
    if (shouldBeActive) {
      markActive();
    } else {
      markIdle();
    }
  };

  const bootstrapPresence = () => {
    stopBootstrap();
    let attempts = 0;

    const pushActive = () => {
      if (!socket.connected || !isActivelyViewing()) return;
      lastState = null;
      markActive();
    };

    pushActive();

    bootstrapTimer = setInterval(() => {
      attempts += 1;
      if (!socket.connected || attempts >= PRESENCE_BOOTSTRAP_ATTEMPTS) {
        stopBootstrap();
        return;
      }
      pushActive();
    }, PRESENCE_BOOTSTRAP_MS);
  };

  const forceIdle = () => {
    if (lastState === false) return;
    lastState = false;
    markIdle();
  };

  const onConnect = () => {
    lastState = null;
    syncPresence();
    bootstrapPresence();
  };

  document.addEventListener("visibilitychange", syncPresence);
  window.addEventListener("focus", syncPresence);
  window.addEventListener("pagehide", forceIdle);
  window.addEventListener("beforeunload", forceIdle);
  socket.on("connect", onConnect);

  if (socket.connected) {
    syncPresence();
    bootstrapPresence();
  }

  return () => {
    stopBootstrap();
    forceIdle();
    stopHeartbeat();
    document.removeEventListener("visibilitychange", syncPresence);
    window.removeEventListener("focus", syncPresence);
    window.removeEventListener("pagehide", forceIdle);
    window.removeEventListener("beforeunload", forceIdle);
    socket.off("connect", onConnect);
  };
}
