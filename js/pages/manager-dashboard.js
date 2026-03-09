import { requireAuth } from "../auth.js";
import { mountHeader, setActiveNav } from "../app.js";
import { getCreditSales, getProcurements, getSales } from "../api.js";
import { PRODUCE } from "../data.js";

const user = requireAuth(["manager"]);
if (!user) throw new Error("Unauthorized");
mountHeader("Manager Dashboard");
setActiveNav();

const sourceEl = document.getElementById("managerSource");
const refreshBtn = document.getElementById("managerRefreshBtn");
const rowsEl = document.getElementById("activityRows");
const stockRowsEl = document.getElementById("managerStockRows");
const cashTotalEl = document.getElementById("managerCashTotal");
const creditOutstandingEl = document.getElementById("managerCreditOutstanding");
const salesBarsEl = document.getElementById("managerSalesBars");
const creditBarsEl = document.getElementById("managerCreditBars");

function asItems(payload) {
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function asDate(value) {
  const t = new Date(value || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function amountFor(item, key) {
  return Number(item?.[key] || 0).toLocaleString();
}

function renderRows(rows) {
  rowsEl.innerHTML = "";
  if (!rows.length) {
    rowsEl.innerHTML = `<tr><td class="empty-row" colspan="5">No activity to display.</td></tr>`;
    return;
  }
  rows.forEach((row) => {
    rowsEl.insertAdjacentHTML("beforeend", `<tr><td>${row.type}</td><td>${row.produce}</td><td>${row.name}</td><td>${row.amount}</td><td>${row.date}</td></tr>`);
  });
}

function computeStock(procurements, sales, credit) {
  const stockMap = {};
  procurements.forEach((item) => {
    const name = item?.produceName;
    if (!name) return;
    stockMap[name] = (stockMap[name] || 0) + Number(item?.tonnageKg || 0);
  });

  [...sales, ...credit].forEach((item) => {
    const name = item?.produceName;
    if (!name) return;
    stockMap[name] = (stockMap[name] || 0) - Number(item?.tonnageKg || 0);
  });

  return stockMap;
}

function renderStock(stockMap) {
  if (!stockRowsEl) return;
  stockRowsEl.innerHTML = "";

  const names = [...new Set([...PRODUCE, ...Object.keys(stockMap)])].sort((a, b) => a.localeCompare(b));
  if (!names.length) {
    stockRowsEl.innerHTML = `<tr><td class="empty-row" colspan="2">No stock data to display.</td></tr>`;
    return;
  }

  names.forEach((name) => {
    stockRowsEl.insertAdjacentHTML(
      "beforeend",
      `<tr><td>${name}</td><td>${Number(stockMap[name] || 0).toLocaleString()}</td></tr>`
    );
  });
}

function renderBars(target, values, tone = "green") {
  if (!target) return;
  target.innerHTML = "";
  const names = [...new Set([...PRODUCE, ...Object.keys(values)])];
  const max = Math.max(1, ...names.map((n) => Number(values[n] || 0)));

  names.forEach((name) => {
    const raw = Number(values[name] || 0);
    const height = Math.round((raw / max) * 120);
    target.insertAdjacentHTML(
      "beforeend",
      `<div class="bar-col"><div class="bar bar-${tone}" style="height:${height}px"></div><span class="bar-label">${name}</span></div>`
    );
  });
}

async function loadDashboard() {
  try {
    const [procurementPayload, salesPayload, creditPayload] = await Promise.all([
      getProcurements(),
      getSales(),
      getCreditSales()
    ]);

    const procurements = asItems(procurementPayload);
    const sales = asItems(salesPayload);
    const credit = asItems(creditPayload);
    const totalCash = sales.reduce((sum, row) => sum + Number(row.amountPaid || 0), 0);
    const totalOutstanding = credit.reduce((sum, row) => {
      const amountDue = Number(row.amountDue || 0);
      const amountPaid = Number(row.amountPaid || 0);
      const remaining = Number(row.remainingAmount ?? Math.max(amountDue - amountPaid, 0));
      return sum + remaining;
    }, 0);
    if (cashTotalEl) cashTotalEl.textContent = `UGX ${totalCash.toLocaleString()}`;
    if (creditOutstandingEl) creditOutstandingEl.textContent = `UGX ${totalOutstanding.toLocaleString()}`;

    const salesByProduce = {};
    sales.forEach((row) => {
      const key = row.produceName || "Unknown";
      salesByProduce[key] = (salesByProduce[key] || 0) + Number(row.tonnageKg || 0);
    });

    const creditByProduce = {};
    credit.forEach((row) => {
      const key = row.produceName || "Unknown";
      creditByProduce[key] = (creditByProduce[key] || 0) + Number(row.tonnageKg || 0);
    });

    renderBars(salesBarsEl, salesByProduce, "green");
    renderBars(creditBarsEl, creditByProduce, "amber");

    document.getElementById("procCount").textContent = procurements.length.toLocaleString();
    document.getElementById("salesCount").textContent = sales.length.toLocaleString();
    document.getElementById("creditCount").textContent = credit.length.toLocaleString();

    const recent = [
      ...procurements.map((r) => ({
        sortAt: asDate(r.procDate),
        type: "Procurement",
        produce: r.produceName || "",
        name: r.dealerName || "",
        amount: amountFor(r, "costUgx"),
        date: r.procDate || ""
      })),
      ...sales.map((r) => ({
        sortAt: asDate(r.saleDate),
        type: "Sale",
        produce: r.produceName || "",
        name: r.buyerName || "",
        amount: amountFor(r, "amountPaid"),
        date: r.saleDate || ""
      })),
      ...credit.map((r) => ({
        sortAt: asDate(r.dispatchDate || r.dueDate),
        type: "Credit",
        produce: r.produceName || "",
        name: r.buyerName || "",
        amount: amountFor(r, "amountDue"),
        date: r.dispatchDate || r.dueDate || ""
      }))
    ]
      .sort((a, b) => b.sortAt - a.sortAt)
      .slice(0, 8);

    renderStock(computeStock(procurements, sales, credit));
    renderRows(recent);
    sourceEl.textContent = "Source: Backend API";
  } catch {
    if (cashTotalEl) cashTotalEl.textContent = "UGX 0";
    if (creditOutstandingEl) creditOutstandingEl.textContent = "UGX 0";
    renderBars(salesBarsEl, {}, "green");
    renderBars(creditBarsEl, {}, "amber");
    renderStock({});
    renderRows([]);
    sourceEl.textContent = "Source: Backend unavailable";
  }
}

refreshBtn?.addEventListener("click", loadDashboard);
loadDashboard();
