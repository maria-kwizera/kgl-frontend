import { requireAuth } from "../auth.js";
import { mountHeader, setActiveNav, setDefaultNow } from "../app.js";
import { BRANCHES, PRODUCE } from "../data.js";
import { appendCollection, getRecentCollection, setPrice } from "../storage.js";
import { createProcurement, getProcurements } from "../api.js";
import { isAlphaNum, isAlphabetic, isMoney, isPhone, isTonnage, required, showError } from "../validation.js";

const user = requireAuth(["manager"]);
if (!user) throw new Error("Unauthorized");
mountHeader("Produce Procurement");
setActiveNav();
setDefaultNow("procDate", "procTime");

const form = document.getElementById("procurementForm");
const result = document.getElementById("procurementResult");
const produceSelect = document.getElementById("produceName");
const branchSelect = document.getElementById("branchName");
const rowsEl = document.getElementById("procurementRows");

function renderRows(rows) {
  rowsEl.innerHTML = "";
  if (!rows.length) {
    rowsEl.innerHTML = `<tr><td class="empty-row" colspan="6">No procurement entries yet.</td></tr>`;
    return;
  }
  rows.forEach((r) => {
    rowsEl.insertAdjacentHTML("beforeend", `<tr><td>${r.produceName || ""}</td><td>${r.produceType || ""}</td><td>${r.tonnageKg || 0}</td><td>${Number(r.costUgx || 0).toLocaleString()}</td><td>${r.branchName || ""}</td><td>${r.procDate || ""}</td></tr>`);
  });
}

async function refreshRows() {
  try {
    const payload = await getProcurements();
    const rows = Array.isArray(payload?.items) ? payload.items.slice(0, 8) : [];
    renderRows(rows);
    return;
  } catch {
    // Fallback when backend list endpoint is unavailable.
  }
  renderRows(getRecentCollection("procurement", 8));
}

PRODUCE.forEach((p) => produceSelect.insertAdjacentHTML("beforeend", `<option value="${p}">${p}</option>`));
BRANCHES.forEach((b) => branchSelect.insertAdjacentHTML("beforeend", `<option value="${b}">${b}</option>`));
refreshRows();

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  result.textContent = "";
  const fd = new FormData(form);
  const model = Object.fromEntries(fd.entries());

  let ok = true;
  const fail = (id, cond, msg) => {
    const el = document.getElementById(`${id}Err`);
    showError(el, cond ? "" : msg);
    ok = ok && cond;
  };

  fail("produceName", isAlphaNum(model.produceName, 2), "Produce name is invalid.");
  fail("produceType", isAlphabetic(model.produceType, 2), "Type must be alphabetic.");
  fail("procDate", required(model.procDate), "Date is required.");
  fail("procTime", required(model.procTime), "Time is required.");
  fail("tonnageKg", isTonnage(model.tonnageKg), "Tonnage must be numeric, min 3 digits.");
  fail("costUgx", isMoney(model.costUgx, 5), "Cost must be numeric, min 5 digits.");
  fail("dealerName", isAlphaNum(model.dealerName, 2), "Dealer name is invalid.");
  fail("branchName", required(model.branchName), "Branch is required.");
  fail("contact", isPhone(model.contact), "Use +256XXXXXXXXX or 0XXXXXXXXX.");
  fail("sellPrice", isMoney(model.sellPrice, 5), "Selling price must be numeric, min 5 digits.");

  if (!ok) return;

  try {
    await createProcurement(model);
    appendCollection("procurement", model);
    setPrice(model.produceName, model.sellPrice);
    result.textContent = "Procurement saved to backend.";
  } catch {
    appendCollection("procurement", model);
    setPrice(model.produceName, model.sellPrice);
    result.textContent = "Procurement saved locally (backend offline).";
  }

  refreshRows();
  form.reset();
  setDefaultNow("procDate", "procTime");
});
