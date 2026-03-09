import { requireAuth } from "../auth.js";
import { mountHeader, setActiveNav, setDefaultNow } from "../app.js";
import { PRODUCE } from "../data.js";
import { appendCollection, getCollection, getPrices, removeCollectionAt, updateCollectionAt } from "../storage.js";
import { canSell, stockOf } from "../stock.js";
import { createSale, deleteSale, getSales, getStockByProduce, updateSale } from "../api.js";
import { isAlphaNum, isMoney, isTonnage, required, showError } from "../validation.js";

const user = requireAuth(["manager", "agent"]);
if (!user) throw new Error("Unauthorized");
mountHeader("Produce Sales");
setActiveNav();
setDefaultNow("saleDate", "saleTime");

const form = document.getElementById("salesForm");
const result = document.getElementById("salesResult");
const produceSelect = document.getElementById("produceName");
const paidInput = document.getElementById("amountPaid");
const stockHint = document.getElementById("stockHint");
const salesAgentInput = document.getElementById("salesAgent");
const rowsEl = document.getElementById("salesRows");
const prices = getPrices();
let latestRows = [];
let editState = null;

function renderRows(rows) {
  latestRows = rows;
  rowsEl.innerHTML = "";
  if (!rows.length) {
    rowsEl.innerHTML = `<tr><td class="empty-row" colspan="8">No sales entries yet.</td></tr>`;
    return;
  }
  rows.forEach((r) => {
    const actions = user.role === "manager"
      ? `<button class="btn btn-secondary btn-sm sales-edit-btn" type="button" data-idx="${r._rowIndex}">Update</button><button class="btn btn-danger btn-sm sales-delete-btn" type="button" data-idx="${r._rowIndex}">Delete</button>`
      : `<span class="small">-</span>`;
    rowsEl.insertAdjacentHTML(
      "beforeend",
      `<tr><td>${r.produceName || ""}</td><td>${r.tonnageKg || 0}</td><td>${Number(r.amountPaid || 0).toLocaleString()}</td><td>${r.buyerName || ""}</td><td>${r.salesAgent || ""}</td><td>${r.saleDate || ""}</td><td>${r.saleTime || ""}</td><td>${actions}</td></tr>`
    );
  });
}

async function refreshRows() {
  try {
    const payload = await getSales();
    const rows = Array.isArray(payload?.items)
      ? payload.items.slice(0, 8).map((r, idx) => ({ ...r, _source: "backend", _rowIndex: idx }))
      : [];
    renderRows(rows);
    return;
  } catch {
    // Fallback when backend list endpoint is unavailable.
  }
  const localRows = getCollection("sales")
    .map((r, idx) => ({ ...r, _source: "local", _rowIndex: idx }))
    .slice()
    .reverse()
    .slice(0, 8);
  renderRows(localRows);
}

async function renderStockHint() {
  const p = produceSelect.value;
  if (!p) return;
  try {
    const payload = await getStockByProduce(p);
    const stock = Number(payload?.stockKg ?? payload?.stock ?? 0);
    const price = payload?.sellingPrice ?? payload?.price ?? "Not set";
    stockHint.textContent = `Available stock: ${stock} kg | Set price: UGX ${price}`;
  } catch {
    stockHint.textContent = `Available stock: ${stockOf(p)} kg | Set price: UGX ${prices[p] || "Not set"}`;
  }
}

PRODUCE.forEach((p) => produceSelect.insertAdjacentHTML("beforeend", `<option value="${p}">${p}</option>`));
produceSelect?.addEventListener("change", renderStockHint);
if (salesAgentInput && !salesAgentInput.value) salesAgentInput.value = user.fullName || "";
refreshRows();

function setEditState(row) {
  editState = {
    source: row._source,
    rowIndex: row._rowIndex,
    backendId: row._id || null
  };
  produceSelect.value = row.produceName || "";
  document.getElementById("tonnageKg").value = row.tonnageKg || "";
  paidInput.value = row.amountPaid || "";
  document.getElementById("buyerName").value = row.buyerName || "";
  salesAgentInput.value = row.salesAgent || user.fullName || "";
  document.getElementById("saleDate").value = row.saleDate || "";
  document.getElementById("saleTime").value = row.saleTime || "";
  const submitBtn = form?.querySelector("button[type='submit']");
  if (submitBtn) submitBtn.textContent = "Update Sale";
  result.textContent = "Editing selected sale. Update fields then click Update Sale.";
}

function clearEditState() {
  editState = null;
  const submitBtn = form?.querySelector("button[type='submit']");
  if (submitBtn) submitBtn.textContent = "Save sale";
}

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

  fail("produceName", required(model.produceName), "Produce is required.");
  fail("tonnageKg", isTonnage(model.tonnageKg), "Tonnage must be numeric with min 3 digits.");
  fail("amountPaid", isMoney(model.amountPaid, 5), "Amount paid must be numeric, min 5 digits.");
  fail("buyerName", isAlphaNum(model.buyerName, 2), "Buyer name is invalid.");
  fail("salesAgent", isAlphaNum(model.salesAgent, 2), "Sales agent name is invalid.");
  fail("saleDate", required(model.saleDate), "Date is required.");
  fail("saleTime", required(model.saleTime), "Time is required.");

  if (!ok) return;

  if (editState) {
    if (editState.source === "backend" && editState.backendId) {
      try {
        await updateSale(editState.backendId, model);
        result.textContent = "Sale updated on backend.";
      } catch (err) {
        result.textContent = err?.message || "Update failed on backend.";
        return;
      }
    } else if (editState.source === "local") {
      const okUpdate = updateCollectionAt("sales", editState.rowIndex, model);
      if (!okUpdate) {
        result.textContent = "Unable to update local sale row.";
        return;
      }
      result.textContent = "Sale updated locally.";
    } else {
      result.textContent = "This row cannot be updated.";
      return;
    }
  } else {
    try {
      await createSale(model);
      appendCollection("sales", model);
      result.textContent = "Sale saved to backend.";
    } catch {
      if (!canSell(model.produceName, model.tonnageKg)) {
        showError(document.getElementById("tonnageKgErr"), "Insufficient stock. Notify manager.");
        return;
      }
      appendCollection("sales", model);
      result.textContent = "Sale saved locally (backend offline).";
    }
  }

  clearEditState();
  refreshRows();
  paidInput.value = "";
  form.reset();
  if (salesAgentInput) salesAgentInput.value = user.fullName || "";
  setDefaultNow("saleDate", "saleTime");
  stockHint.textContent = "";
});

rowsEl?.addEventListener("click", async (e) => {
  const editBtn = e.target.closest(".sales-edit-btn");
  if (editBtn) {
    const rowIndex = Number(editBtn.getAttribute("data-idx"));
    if (Number.isNaN(rowIndex)) return;
    const row = latestRows.find((r) => Number(r._rowIndex) === rowIndex);
    if (!row) return;
    setEditState(row);
    return;
  }

  const deleteBtn = e.target.closest(".sales-delete-btn");
  if (!deleteBtn) return;
  const rowIndex = Number(deleteBtn.getAttribute("data-idx"));
  if (Number.isNaN(rowIndex)) return;
  const row = latestRows.find((r) => Number(r._rowIndex) === rowIndex);
  if (!row) return;

  if (!window.confirm("Delete this sale record?")) return;

  if (row._source === "backend" && row._id) {
    try {
      await deleteSale(row._id);
      result.textContent = "Sale deleted from backend.";
    } catch (err) {
      result.textContent = err?.message || "Delete failed on backend.";
      return;
    }
  } else if (row._source === "local") {
    const okDelete = removeCollectionAt("sales", row._rowIndex);
    if (!okDelete) {
      result.textContent = "Unable to delete local sale row.";
      return;
    }
    result.textContent = "Sale deleted locally.";
  }

  if (editState && Number(editState.rowIndex) === Number(row._rowIndex)) {
    clearEditState();
  }
  refreshRows();
});
