import { login } from "../auth.js";

const form = document.getElementById("loginForm");
const error = document.getElementById("loginError");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.getElementById("togglePasswordBtn");

togglePasswordBtn?.addEventListener("click", () => {
  if (!passwordInput) return;
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePasswordBtn.textContent = isHidden ? "Hide" : "Show";
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  error.textContent = "";
  const fd = new FormData(form);
  const result = await login(fd.get("username"), fd.get("password"));
  if (!result?.ok) {
    error.textContent = result?.message || "Unable to sign in";
    return;
  }
  const user = result.user;
  if (user.role === "director") window.location.href = "director-dashboard.html";
  else if (user.role === "manager") window.location.href = "manager-dashboard.html";
  else window.location.href = "agent-dashboard.html";
});
