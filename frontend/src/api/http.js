import { getStoredToken } from "./authApi.js";

export const API_URL = import.meta.env.VITE_BACKEND_URL || "";

export function authHeaders() {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options.headers
    }
  });

  return res;
}
