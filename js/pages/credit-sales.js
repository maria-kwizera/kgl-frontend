import { requireAuth } from "../auth.js";
import { mountHeader, setActiveNav, setDefaultNow } from "../app.js";
import { PRODUCE } from "../data.js";
import { appendCollection, getRecentCollection } from "../storage.js";
import { canSell, stockOf } from "../stock.js";
import { createCreditSale, getCreditSales, getStockByProduce, payCreditSale } from "../api.js";
import { isAlphaNum, isNin, isPhone, isMoney, isTonnage, isAlphabetic, required, showError } from "../validation.js";

const user = requireAuth(["manager", "agent"]);
if (!user) throw new Error("Unauthorized");
mountHeader("Credit Sales");
setActiveNav();

const form = document.getElementById("creditForm");
const result = document.getElementById("creditResult");
const produceSelect = document.getElementById("produceName");
const stockHint = document.getElementById("creditStockHint");
const salesAgentInput = document.getElementById("salesAgent");
const rowsEl = document.getElementById("creditRows");
const paymentForm = document.getElementById("paymentForm");
const paymentSelect = document.getElementById("paymentCreditId");
const paymentResult = document.getElementById("paymentResult");
const paymentDate = document.getElementById("paymentDate");
const paymentHistoryModal = document.getElementById("paymentHistoryModal");
const closeHistoryBtn = document.getElementById("closeHistoryBtn");
const historyTitle = document.getElementById("historyTitle");
const historyRows = document.getElementById("historyRows");
let latestCreditRows = [];

function renderRows(rows) {
  rowsEl.innerHTML = "";
  if (!rows.length) {
    rowsEl.innerHTML = `<tr><td class="empty-row" colspan="10">No credit sales entries yet.</td></tr>`;
    return;
  }
  rows.forEach((r, index) => {
    const amountDue = Number(r.amountDue || 0);
    const amountPaid = Number(r.amountPaid || 0);
    const remaining = Number(r.remainingAmount ?? Math.max(amountDue - amountPaid, 0));
    const status = r.paymentStatus || (remaining <= 0 ? "paid" : amountPaid > 0 ? "partial" : "unpaid");
    rowsEl.insertAdjacentHTML("beforeend", `<tr><td>${r.buyerName || ""}</td><td>${r.produceName || ""}</td><td>${r.tonnageKg || 0}</td><td>${amountDue.toLocaleString()}</td><td>${amountPaid.toLocaleString()}</td><td>${remaining.toLocaleString()}</td><td>${status}</td><td>${r.dueDate || ""}</td><td>${r.salesAgent || ""}</td><td><button class="btn btn-secondary history-btn" type="button" data-row="${index}">View Payments</button></td></tr>`);
  });
}

function openHistoryModal(row) {
  if (!paymentHistoryModal || !historyRows || !historyTitle) return;
  historyRows.innerHTML = "";
  const buyer = row?.buyerName || "Buyer";
  const produce = row?.produceName || "Produce";
  historyTitle.textContent = `${buyer} | ${produce}`;

  const history = Array.isArray(row?.paymentHistory) ? row.paymentHistory : [];
  if (!history.length) {
    historyRows.innerHTML = `<tr><td class="empty-row" colspan="3">No payments recorded yet.</td></tr>`;
  } else {
    history.forEach((entry) => {
      historyRows.insertAdjacentHTML("beforeend", `<tr><td>${Number(entry.amount || 0).toLocaleString()}</td><td>${entry.paymentDate || ""}</td><td>${entry.receivedBy || "-"}</td></tr>`);
    });
  }

  paymentHistoryModal.classList.remove("hidden");
  paymentHistoryModal.hidden = false;
  paymentHistoryModal.setAttribute("aria-hidden", "false");
}

function closeHistoryModal() {
  if (!paymentHistoryModal) return;
  paymentHistoryModal.classList.add("hidden");
  paymentHistoryModal.hidden = true;
  paymentHistoryModal.setAttribute("aria-hidden", "true");
}

function renderPaymentOptions(rows) {
  if (!paymentSelect) return;
  paymentSelect.innerHTML = "";
  const payable = rows.filter((r) => {
    if (!r?._id) return false;
    const amountDue = Number(r.amountDue || 0);
    const amountPaid = Number(r.amountPaid || 0);
    const remaining = Number(r.remainingAmount ?? Math.max(amountDue - amountPaid, 0));
    return remaining > 0;
  });

  if (!payable.length) {
    paymentSelect.insertAdjacentHTML("beforeend", `<option value="">No unpaid credit sales</option>`);
    return;
  }

  payable.forEach((r) => {
    const amountDue = Number(r.amountDue || 0);
    const amountPaid = Number(r.amountPaid || 0);
    const remaining = Number(r.remainingAmount ?? Math.max(amountDue - amountPaid, 0));
    const label = `${r.buyerName || "Buyer"} | ${r.produceName || "Produce"} | Remaining UGX ${remaining.toLocaleString()}`;
    paymentSelect.insertAdjacentHTML("beforeend", `<option value="${r._id}">${label}</option>`);
  });
}

async function refreshRows() {
  try {
    const payload = await getCreditSales();
    const rows = Array.isArray(payload?.items) ? payload.items.slice(0, 8) : [];
    latestCreditRows = rows;
    renderRows(rows);
    renderPaymentOptions(latestCreditRows);
    return;
  } catch {
    // Fallback when backend list endpoint is unavailable.
  }
  latestCreditRows = [];
  renderRows(getRecentCollection("credit", 8));
  renderPaymentOptions([]);
}

PRODUCE.forEach((p) => produceSelect.insertAdjacentHTML("beforeend", `<option value="${p}">${p}</option>`));
produceSelect?.addEventListener("change", async () => {
  const produceName = produceSelect.value;
  try {
    const payload = await getStockByProduce(produceName);
    const stock = Number(payload?.stockKg ?? payload?.stock ?? 0);
    stockHint.textContent = `Available stock: ${stock} kg`;
  } catch {
    stockHint.textContent = `Available stock: ${stockOf(produceName)} kg`;
  }
});
if (salesAgentInput && !salesAgentInput.value) salesAgentInput.value = user.fullName || "";
refreshRows();
setDefaultNow("paymentDate");

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

  fail("buyerName", isAlphaNum(model.buyerName, 2), "Buyer name is invalid.");
  fail("nationalId", isNin(model.nationalId), "Use valid NIN format.");
  fail("location", isAlphaNum(model.location, 2), "Location is invalid.");
  fail("contact", isPhone(model.contact), "Use +256XXXXXXXXX or 0XXXXXXXXX.");
  fail("amountDue", isMoney(model.amountDue, 5), "Amount due must be numeric and >= 5 digits.");
  fail("salesAgent", isAlphaNum(model.salesAgent, 2), "Sales agent name is invalid.");
  fail("dueDate", required(model.dueDate), "Due date is required.");
  fail("produceName", isAlphaNum(model.produceName, 2), "Produce name is invalid.");
  fail("produceType", isAlphabetic(model.produceType, 2), "Type must be alphabetic.");
  fail("tonnageKg", isTonnage(model.tonnageKg), "Tonnage must be numeric, min 3 digits.");
  fail("dispatchDate", required(model.dispatchDate), "Dispatch date is required.");

  if (!ok) return;

  try {
    await createCreditSale(model);
    appendCollection("credit", model);
    result.textContent = "Credit sale saved to backend.";
  } catch {
    if (!canSell(model.produceName, model.tonnageKg)) {
      showError(document.getElementById("tonnageKgErr"), "Insufficient stock. Notify manager.");
      return;
    }
    appendCollection("credit", model);
    result.textContent = "Credit sale saved locally (backend offline).";
  }

  refreshRows();
  form.reset();
  if (salesAgentInput) salesAgentInput.value = user.fullName || "";
  stockHint.textContent = "";
});

paymentForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  paymentResult.textContent = "";
  const fd = new FormData(paymentForm);
  const model = Object.fromEntries(fd.entries());

  let ok = true;
  const fail = (id, cond, msg) => {
    const el = document.getElementById(`${id}Err`);
    showError(el, cond ? "" : msg);
    ok = ok && cond;
  };

  fail("paymentCreditId", required(model.creditSaleId), "Select a credit sale.");
  fail("paymentAmount", isMoney(model.amount, 1), "Payment amount must be numeric.");
  fail("paymentDate", required(model.paymentDate), "Payment date is required.");
  if (!ok) return;

  try {
    await payCreditSale(model.creditSaleId, { amount: model.amount, paymentDate: model.paymentDate });
    paymentResult.textContent = "Credit payment recorded.";
    paymentForm.reset();
    if (paymentDate && !paymentDate.value) setDefaultNow("paymentDate");
    refreshRows();
  } catch (err) {
    paymentResult.textContent = err?.message || "Failed to save payment.";
  }
});

rowsEl?.addEventListener("click", (e) => {
  const btn = e.target.closest(".history-btn");
  if (!btn) return;
  const index = Number(btn.getAttribute("data-row"));
  if (Number.isNaN(index)) return;
  const row = latestCreditRows[index];
  if (!row) return;
  openHistoryModal(row);
});

closeHistoryBtn?.addEventListener("click", closeHistoryModal);
paymentHistoryModal?.addEventListener("click", (e) => {
  if (e.target === paymentHistoryModal) closeHistoryModal();
});
