import { AuthService } from "./services/auth.js";
import { StorageService } from "./services/storage.js";
document.addEventListener("DOMContentLoaded", () => {
    // Pastikan data awal tersedia
    StorageService.init();
    // Jika sudah memiliki sesi login aktif, redirect otomatis
    AuthService.redirectIfLoggedIn();
    const loginForm = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const submitBtn = document.getElementById("submitBtn");
    const errorAlert = document.getElementById("errorAlert");
    function showError(message) {
        if (!errorAlert)
            return;
        errorAlert.textContent = message;
        errorAlert.style.display = "block";
    }
    function hideError() {
        if (!errorAlert)
            return;
        errorAlert.style.display = "none";
        errorAlert.textContent = "";
    }
    function setLoading(loading) {
        if (!submitBtn)
            return;
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Memproses...";
        }
        else {
            submitBtn.disabled = false;
            submitBtn.textContent = "Masuk";
        }
    }
    if (loginForm && usernameInput && passwordInput && submitBtn) {
        loginForm.addEventListener("submit", async (e) => {
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
                }
                else {
                    window.location.href = "ambil-antrian.html";
                }
            }
            catch (err) {
                const errorMsg = err instanceof Error
                    ? err.message
                    : "Terjadi gangguan koneksi jaringan saat otentikasi.";
                showError(errorMsg);
                setLoading(false);
            }
        });
    }
    // Helper listener untuk akun uji cepat
    const testAccountPills = document.querySelectorAll("[data-test-user]");
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
