const KEYS = {
  procurement: "kgl_procurement",
  sales: "kgl_sales",
  credit: "kgl_credit_sales",
  prices: "kgl_prices"
};

function read(key, fallback = []) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCollection(name) {
  return read(KEYS[name], []);
}

export function getRecentCollection(name, limit = 8) {
  const list = getCollection(name);
  return list.slice().reverse().slice(0, limit);
}

export function appendCollection(name, item) {
  const list = getCollection(name);
  list.push(item);
  write(KEYS[name], list);
}

export function updateCollectionAt(name, index, patch) {
  const list = getCollection(name);
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return false;
  list[idx] = { ...(list[idx] || {}), ...(patch || {}) };
  write(KEYS[name], list);
  return true;
}

export function removeCollectionAt(name, index) {
  const list = getCollection(name);
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return false;
  list.splice(idx, 1);
  write(KEYS[name], list);
  return true;
}

export function getPrices() {
  return read(KEYS.prices, {});
}

export function setPrice(produce, price) {
  const prices = getPrices();
  prices[produce] = Number(price);
  write(KEYS.prices, prices);
}

export function clearLocalBusinessData() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export function getStockSnapshot() {
  const bought = getCollection("procurement");
  const sold = getCollection("sales");
  const credit = getCollection("credit");

  const stock = {};
  for (const entry of bought) {
    stock[entry.produceName] = (stock[entry.produceName] || 0) + Number(entry.tonnageKg || 0);
  }
  for (const sale of [...sold, ...credit]) {
    stock[sale.produceName] = (stock[sale.produceName] || 0) - Number(sale.tonnageKg || 0);
  }
  return stock;
}
