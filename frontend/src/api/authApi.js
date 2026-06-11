import { googleLogout } from "@react-oauth/google";

const API_URL = import.meta.env.VITE_BACKEND_URL || "";
const AUTH_USER_KEY = "tsmchat-user";
const AUTH_TOKEN_KEY = "tsmchat-token";

export async function loginWithGoogleCredential(credential) {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential })
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  const data = await res.json();

  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));

  return data.user;
}

export function getStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function updateStoredUserId(newUserId) {
  const user = getStoredUser();
  if (!user) return null;

  const updatedUser = { ...user, id: newUserId };
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
  return updatedUser;
}

export function removeStoredUser() {
  googleLogout();
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
