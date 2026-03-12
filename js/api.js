const DEFAULT_API_BASE = (() => {
  const host = window.location.hostname || "localhost";
  const localHosts = new Set(["localhost", "127.0.0.1"]);
  if (localHosts.has(host)) return "http://localhost:4000/api";
  return "https://karibu-groceries-backend-d5zh.onrender.com/api";
})();
const SESSION_KEY = "kgl_user";
const API_BASE_KEY = "kgl_api_base";
const LOCAL_API_BASE = "http://localhost:4000/api";
const RENDER_API_BASE = "https://karibu-groceries-backend-d5zh.onrender.com/api";

// Optional URL toggle: ?api=local | ?api=render | ?api=clear
(() => {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const mode = String(params.get("api") || "").trim().toLowerCase();
    if (!mode) return;
    if (mode === "local") localStorage.setItem(API_BASE_KEY, LOCAL_API_BASE);
    else if (mode === "render") localStorage.setItem(API_BASE_KEY, RENDER_API_BASE);
    else if (mode === "clear") localStorage.removeItem(API_BASE_KEY);
  } catch {
    // ignore
  }
})();

function baseUrl() {
  try {
    const stored = localStorage.getItem(API_BASE_KEY);
    const value = String(stored || "").trim();
    return value || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
}

function authHeaders() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const user = JSON.parse(raw);
    if (!user) return {};
    if (!user.token) return {};
    return {
      Authorization: `Bearer ${user.token}`
    };
  } catch {
    return {};
  }
}

async function request(path, { method = "GET", body } = {}) {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    }
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error("Failed to fetch. Check backend URL or ensure backend is running.");
  }
  const text = await res.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return data;
}

export function setApiBase(url) {
  localStorage.setItem(API_BASE_KEY, url);
}

export async function apiLogin(username, password) {
  return request("/auth/login", {
    method: "POST",
    body: { username, password }
  });
}

export async function createProcurement(payload) {
  return request("/procurements", { method: "POST", body: payload });
}
export async function getProcurements() {
  return request("/procurements");
}

export async function createSale(payload) {
  return request("/sales", { method: "POST", body: payload });
}
export async function getSales() {
  return request("/sales");
}
export async function updateSale(id, payload) {
  const path = `/sales/${encodeURIComponent(id)}`;
  try {
    return await request(path, { method: "PATCH", body: payload });
  } catch (err) {
    const msg = String(err?.message || "");
    if (err?.status === 404 || /route not found/i.test(msg)) {
      return request(path, { method: "PUT", body: payload });
    }
    throw err;
  }
}
export async function deleteSale(id) {
  return request(`/sales/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createCreditSale(payload) {
  return request("/credit-sales", { method: "POST", body: payload });
}
export async function getCreditSales() {
  return request("/credit-sales");
}
export async function payCreditSale(id, payload) {
  return request(`/credit-sales/${encodeURIComponent(id)}/payment`, { method: "PATCH", body: payload });
}

export async function getStockByProduce(produceName) {
  return request(`/stock/by-produce?produceName=${encodeURIComponent(produceName)}`);
}

export async function getReportSummary() {
  return request("/reports/summary");
}

export async function getReportStock() {
  return request("/reports/stock");
}
