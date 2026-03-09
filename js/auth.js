import { apiLogin } from "./api.js";

const SESSION_KEY = "kgl_user";

export async function login(username, password) {
  try {
    const payload = await apiLogin(String(username || "").trim(), String(password || "").trim());
    const token = payload?.token || payload?.user?.token || "";
    const user = payload?.user || payload;
    if (user?.role && token) {
      const sessionUser = { ...user, token };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      return { ok: true, user: sessionUser };
    }
    return { ok: false, message: "Invalid credentials" };
  } catch (err) {
    return { ok: false, message: err?.message || "Unable to sign in" };
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
}

export function currentUser() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function requireAuth(allowedRoles = []) {
  const user = currentUser();
  if (!user || !user.token) {
    window.location.href = "login.html";
    return null;
  }
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    window.location.href = "unauthorized.html";
    return null;
  }
  return user;
}
