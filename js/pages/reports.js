import { requireAuth } from "../auth.js";
import { mountHeader, setActiveNav } from "../app.js";
import { clearLocalBusinessData, getCollection, getStockSnapshot } from "../storage.js";
import { getReportSummary, getReportStock } from "../api.js";

const user = requireAuth(["director"]);
if (!user) throw new Error("Unauthorized");
mountHeader("Branch Aggregated Reports");
setActiveNav();

const sourceEl = document.getElementById("reportSource");
const refreshBtn = document.getElementById("refreshReportBtn");
const resetLocalBtn = document.getElementById("resetLocalBtn");

function renderSummary({ totalProc = 0, totalSales = 0, totalCredit = 0 }) {
  document.getElementById("kpiProc").textContent = `UGX ${Number(totalProc).toLocaleString()}`;
  document.getElementById("kpiSales").textContent = `UGX ${Number(totalSales).toLocaleString()}`;
  document.getElementById("kpiCredit").textContent = `UGX ${Number(totalCredit).toLocaleString()}`;
}

function renderStock(stockMap) {
  const tbody = document.getElementById("stockRows");
  tbody.innerHTML = "";
  const entries = Object.entries(stockMap);
  if (!entries.length) {
    tbody.innerHTML = `<tr><td class="empty-row" colspan="2">No stock rows to display.</td></tr>`;
    return;
  }
  entries.forEach(([name, qty]) => {
    tbody.insertAdjacentHTML("beforeend", `<tr><td>${name}</td><td>${qty}</td></tr>`);
  });
}

async function loadReport() {
  try {
    const [summary, stockRows] = await Promise.all([getReportSummary(), getReportStock()]);
    const stockMap = {};
    const rows = Array.isArray(stockRows?.items) ? stockRows.items : (Array.isArray(stockRows) ? stockRows : []);
    rows.forEach((row) => {
      const name = row.produceName || row.name;
      const qty = Number(row.stockKg ?? row.stock ?? 0);
      if (name) stockMap[name] = qty;
    });

    renderSummary({
      totalProc: summary?.totalProcurementCost ?? summary?.totalProc ?? 0,
      totalSales: summary?.totalCashSales ?? summary?.totalSales ?? 0,
      totalCredit: summary?.totalCreditOutstanding ?? summary?.totalCredit ?? 0
    });
    renderStock(stockMap);
    sourceEl.textContent = "Source: Backend API";
    return;
  } catch {
    // Fallback to local aggregates for offline/demo mode.
  }

  const stock = getStockSnapshot();
  const sales = getCollection("sales");
  const credit = getCollection("credit");
  const procurement = getCollection("procurement");

  const totalProc = procurement.reduce((sum, item) => sum + Number(item.costUgx || 0), 0);
  const totalSales = sales.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
  const totalCredit = credit.reduce((sum, item) => sum + Number(item.amountDue || 0), 0);

  renderSummary({ totalProc, totalSales, totalCredit });
  renderStock(stock);
  sourceEl.textContent = "Source: Local Demo Data";
}

refreshBtn?.addEventListener("click", loadReport);
resetLocalBtn?.addEventListener("click", () => {
  clearLocalBusinessData();
  loadReport();
});

loadReport();

