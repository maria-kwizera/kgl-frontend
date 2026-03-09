export function isAlphaNum(v, min = 2) {
  return typeof v === "string" && /^[a-zA-Z0-9\s.-]+$/.test(v.trim()) && v.trim().length >= min;
}

export function isAlphabetic(v, min = 2) {
  return typeof v === "string" && /^[a-zA-Z\s]+$/.test(v.trim()) && v.trim().length >= min;
}

export function isPhone(v) {
  return /^(\+256|0)\d{9}$/.test((v || "").trim());
}

export function isNin(v) {
  return /^[A-Z]{2}\d{12}[A-Z0-9]{2}$/.test((v || "").trim().toUpperCase());
}

export function isMoney(v, minDigits = 5) {
  const s = String(v || "").trim();
  return /^\d+$/.test(s) && s.length >= minDigits;
}

export function isTonnage(v) {
  const s = String(v || "").trim();
  return /^\d+$/.test(s) && s.length >= 3;
}

export function required(v) {
  return String(v || "").trim().length > 0;
}

export function showError(el, msg) {
  el.textContent = msg || "";
}
