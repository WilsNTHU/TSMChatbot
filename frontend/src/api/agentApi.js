import { apiFetch } from "./http.js";

export async function fetchAgentStatus() {
  const res = await apiFetch("/api/agent/status");
  if (!res.ok) return { enabled: false, model: "" };
  return res.json();
}

export async function sendAgentMessage({ message, history, roomId }) {
  const res = await apiFetch("/api/agent/chat", {
    method: "POST",
    body: JSON.stringify({ message, history, roomId })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Agent request failed");
  return data;
}
