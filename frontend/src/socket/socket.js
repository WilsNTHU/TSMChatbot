import { io } from "socket.io-client";
import { setupPresenceTracking } from "./presence.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;

let socket = null;
let teardownPresence = null;
const connectListeners = new Set();

export function onSocketConnect(listener) {
  connectListeners.add(listener);
  if (socket?.connected) {
    listener();
  }
  return () => connectListeners.delete(listener);
}

function notifyConnectListeners() {
  for (const listener of connectListeners) {
    try {
      listener();
    } catch (err) {
      console.error("Socket connect listener error:", err);
    }
  }
}

export function connectSocket(token) {
  if (socket?.connected) {
    teardownPresence?.();
    teardownPresence = setupPresenceTracking(socket);
    return socket;
  }

  if (socket) {
    socket.auth = { token };
    socket.connect();
    teardownPresence?.();
    teardownPresence = setupPresenceTracking(socket);
    return socket;
  }

  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    notifyConnectListeners();
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  teardownPresence?.();
  teardownPresence = setupPresenceTracking(socket);

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  teardownPresence?.();
  teardownPresence = null;

  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
