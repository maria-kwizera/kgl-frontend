import { currentUser, logout } from "./auth.js";

export function mountHeader(title) {
  const user = currentUser();
  const slot = document.getElementById("topbarSlot");
  if (!slot || !user) return;
  slot.innerHTML = `
    <div class="topbar">
      <div>
        <div class="company-title-row">
          <span class="company-title-dot" aria-hidden="true"></span>
          <strong>Karibu Groceries LTD</strong>
        </div>
        <h2>${title}</h2>
        <p>Signed in as ${user.fullName} (${user.role})</p>
      </div>
    </div>
  `;
}

export function setActiveNav() {
  const user = currentUser();
  const path = window.location.pathname.split("/").pop();
  document.querySelectorAll(".nav a").forEach((a) => {
    const only = a.getAttribute("data-role-only");
    if (only && user?.role !== only) {
      a.style.display = "none";
      return;
    }
    const isLogout = a.getAttribute("data-action") === "logout";
    if (!isLogout && a.getAttribute("href") === path) a.classList.add("active");
  });

  document.querySelectorAll('.nav a[data-action="logout"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  });
}

export function setDefaultNow(dateId, timeId) {
  const now = new Date();
  const dateEl = document.getElementById(dateId);
  const timeEl = document.getElementById(timeId);
  if (dateEl && !dateEl.value) {
    dateEl.value = now.toISOString().slice(0, 10);
  }
  if (timeEl && !timeEl.value) {
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    timeEl.value = `${hh}:${mm}`;
  }
}
