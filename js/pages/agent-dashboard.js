import { requireAuth } from "../auth.js";
import { mountHeader, setActiveNav } from "../app.js";
import { PRODUCE } from "../data.js";
import { getCreditSales, getSales } from "../api.js";

const user = requireAuth(["agent"]);
if (!user) throw new Error("Unauthorized");
mountHeader("Sales Agent Dashboard");
setActiveNav();

const sourceEl = document.getElementById("agentSource");
const refreshBtn = document.getElementById("agentRefreshBtn");
const rowsEl = document.getElementById("activityRows");
const salesBarsEl = document.getElementById("salesBars");
const creditBarsEl = document.getElementById("creditBars");

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
    const [salesPayload, creditPayload] = await Promise.all([
      getSales(),
      getCreditSales()
    ]);

    const sales = asItems(salesPayload);
    const credit = asItems(creditPayload);

    const totalCash = sales.reduce((sum, row) => sum + Number(row.amountPaid || 0), 0);
    const totalOutstanding = credit.reduce((sum, row) => {
      const amountDue = Number(row.amountDue || 0);
      const amountPaid = Number(row.amountPaid || 0);
      const remaining = Number(row.remainingAmount ?? Math.max(amountDue - amountPaid, 0));
      return sum + remaining;
    }, 0);

    document.getElementById("cashTotal").textContent = `UGX ${totalCash.toLocaleString()}`;
    document.getElementById("creditOutstanding").textContent = `UGX ${totalOutstanding.toLocaleString()}`;

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

    const recent = [
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

    renderRows(recent);
    sourceEl.textContent = "Source: Backend API";
  } catch {
    document.getElementById("cashTotal").textContent = "UGX 0";
    document.getElementById("creditOutstanding").textContent = "UGX 0";
    renderBars(salesBarsEl, {}, "green");
    renderBars(creditBarsEl, {}, "amber");
    renderRows([]);
    sourceEl.textContent = "Source: Backend unavailable";
  }
}

refreshBtn?.addEventListener("click", loadDashboard);
loadDashboard();
