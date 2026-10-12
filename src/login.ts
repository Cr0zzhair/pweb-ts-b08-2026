import { AuthService } from "./services/auth.js";
import { StorageService } from "./services/storage.js";

document.addEventListener("DOMContentLoaded", () => {
  // Pastikan data awal tersedia
  StorageService.init();

  // Jika sudah memiliki sesi login aktif, redirect otomatis
  AuthService.redirectIfLoggedIn();

  const loginForm = document.getElementById("loginForm") as HTMLFormElement | null;
  const usernameInput = document.getElementById("username") as HTMLInputElement | null;
  const passwordInput = document.getElementById("password") as HTMLInputElement | null;
  const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement | null;
  const errorAlert = document.getElementById("errorAlert") as HTMLDivElement | null;

  function showError(message: string): void {
    if (!errorAlert) return;
    errorAlert.textContent = message;
    errorAlert.style.display = "block";
  }

  function hideError(): void {
    if (!errorAlert) return;
    errorAlert.style.display = "none";
    errorAlert.textContent = "";
  }

  function setLoading(loading: boolean): void {
    if (!submitBtn) return;
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Memproses...";
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = "Masuk";
    }
  }

  if (loginForm && usernameInput && passwordInput && submitBtn) {
    loginForm.addEventListener("submit", async (e: Event) => {
      e.preventDefault();
      hideError();

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        showError("Harap masukkan username dan password.");
        return;
      }

      setLoading(true);

      try {
        const result = await AuthService.login({ username, password });

        if (!result.success || !result.session) {
          showError(result.message || "Login gagal. Silakan coba lagi.");
          setLoading(false);
          return;
        }

        // Auto-redirect berdasarkan role
        const role = result.session.role;
        if (role === "admin" || role === "moderator") {
          window.location.href = "index.html";
        } else {
          window.location.href = "operator.html";
        }
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Terjadi gangguan koneksi jaringan saat otentikasi.";
        showError(errorMsg);
        setLoading(false);
      }
    });
  }

  // Helper listener untuk akun uji cepat
  const testAccountPills = document.querySelectorAll<HTMLElement>("[data-test-user]");
  testAccountPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const u = pill.getAttribute("data-test-user");
      const p = pill.getAttribute("data-test-pass");
      if (u && p && usernameInput && passwordInput) {
        usernameInput.value = u;
        passwordInput.value = p;
        hideError();
        usernameInput.focus();
      }
    });
  });
});
