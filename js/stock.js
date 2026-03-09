import { getStockSnapshot } from "./storage.js";

export function stockOf(produceName) {
  const stock = getStockSnapshot();
  return stock[produceName] || 0;
}

export function canSell(produceName, tonnageKg) {
  const current = stockOf(produceName);
  return Number(tonnageKg) <= current;
}
