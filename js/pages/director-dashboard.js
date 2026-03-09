import { requireAuth } from "../auth.js";
import { mountHeader, setActiveNav } from "../app.js";
import { getCreditSales, getProcurements, getReportSummary, getSales } from "../api.js";

const user = requireAuth(["director"]);
if (!user) throw new Error("Unauthorized");
mountHeader("Director Dashboard");
setActiveNav();

const sourceEl = document.getElementById("directorSource");
const refreshBtn = document.getElementById("directorRefreshBtn");

function asItems(payload) {
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function fmtMoney(value) {
  return `UGX ${Number(value || 0).toLocaleString()}`;
}

async function loadDashboard() {
  try {
    const [summary, procurementPayload, salesPayload, creditPayload] = await Promise.all([
      getReportSummary(),
      getProcurements(),
      getSales(),
      getCreditSales()
    ]);

    document.getElementById("kpiProc").textContent = fmtMoney(summary?.totalProcurementCost ?? summary?.totalProc);
    document.getElementById("kpiSales").textContent = fmtMoney(summary?.totalCashSales ?? summary?.totalSales);
    document.getElementById("kpiCredit").textContent = fmtMoney(summary?.totalCreditOutstanding ?? summary?.totalCredit);

    document.getElementById("procCount").textContent = asItems(procurementPayload).length.toLocaleString();
    document.getElementById("salesCount").textContent = asItems(salesPayload).length.toLocaleString();
    document.getElementById("creditCount").textContent = asItems(creditPayload).length.toLocaleString();
    sourceEl.textContent = "Source: Backend API";
  } catch {
    sourceEl.textContent = "Source: Backend unavailable";
  }
}

refreshBtn?.addEventListener("click", loadDashboard);
loadDashboard();
