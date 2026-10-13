import { AuthService } from "./services/auth.js";
import { StorageService } from "./services/storage.js";
import { AudioService } from "./services/audio.js";
document.addEventListener("DOMContentLoaded", () => {
    StorageService.init();
    // Auth Guard & Role Guard: Khusus Admin dan Moderator
    const session = AuthService.requireAuth(["admin", "moderator"]);
    if (!session)
        return;
    // Render User Info & Role
    const navUserEl = document.getElementById("navUser");
    const navRoleEl = document.getElementById("navRole");
    if (navUserEl)
        navUserEl.textContent = session.firstName || session.username;
    if (navRoleEl) {
        navRoleEl.textContent = session.role.toUpperCase();
        navRoleEl.className = `role-pill role-${session.role}`;
    }
    // Sembunyikan link Admin jika role bukan admin/moderator
    const adminNavLink = document.getElementById("adminNavLink");
    if (adminNavLink) {
        if (session.role === "admin" || session.role === "moderator") {
            adminNavLink.style.display = "inline-block";
        }
        else {
            adminNavLink.style.display = "none";
        }
    }
    // Logout Handler
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            AuthService.logout();
        });
    }
    // Audio Toggle Handler
    const soundToggleBtn = document.getElementById("soundToggleBtn");
    function updateSoundButton() {
        if (!soundToggleBtn)
            return;
        const enabled = AudioService.isEnabled();
        soundToggleBtn.textContent = enabled ? "🔊 Suara: Aktif" : "🔇 Suara: Mati";
        soundToggleBtn.className = enabled
            ? "btn btn-secondary btn-sm"
            : "btn btn-danger btn-sm";
    }
    if (soundToggleBtn) {
        updateSoundButton();
        soundToggleBtn.addEventListener("click", () => {
            const current = AudioService.isEnabled();
            AudioService.setEnabled(!current);
            updateSoundButton();
        });
    }
    // Render Operator Cards
    const cardsContainer = document.getElementById("operatorCardsContainer");
    function renderOperatorCards() {
        if (!cardsContainer)
            return;
        const services = StorageService.getActiveServices();
        cardsContainer.innerHTML = "";
        if (services.length === 0) {
            cardsContainer.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3.5rem;">
          <div class="card-eyebrow">STATUS SISTEM</div>
          <h3 style="color: var(--text-muted); font-size: 1.65rem;">Tidak ada layanan antrian aktif saat ini</h3>
          <p style="font-size: 0.85rem; color: var(--text-faint); margin-top: 0.5rem;">
            Silakan aktifkan atau buat jenis antrian baru di Dashboard Admin.
          </p>
        </div>
      `;
            return;
        }
        services.forEach((service) => {
            const waitingCount = StorageService.getWaitingCount(service.code);
            const currentlyCalled = StorageService.getCurrentlyCalled(service.code);
            const nextTicket = StorageService.getNextTicket(service.code);
            const card = document.createElement("div");
            card.className = "operator-card";
            const calledNumberText = currentlyCalled ? currentlyCalled.ticketNumber : "-";
            const nextNumberText = nextTicket ? nextTicket.ticketNumber : "-";
            const nextPriorityText = nextTicket ? `Prioritas ${nextTicket.priority}` : "";
            const hasNext = !!nextTicket;
            const hasCurrent = !!currentlyCalled;
            card.innerHTML = `
        <div class="operator-card-header">
          <div>
            <div class="card-eyebrow">POLIKLINIK</div>
            <div class="operator-service-name">${service.name}</div>
          </div>
          <div class="operator-waiting-count">${waitingCount} MENUNGGU</div>
        </div>

        <div class="operator-display-grid">
          <div>
            <div class="display-box-label">SEDANG DIPANGGIL</div>
            <div class="display-box-number">${calledNumberText}</div>
          </div>
          <div>
            <div class="display-box-label">BERIKUTNYA</div>
            <div class="display-box-next">${nextNumberText}</div>
            ${nextPriorityText ? `<div class="display-box-priority">${nextPriorityText}</div>` : ""}
          </div>
        </div>

        <div>
          <button 
            class="btn btn-primary btn-block call-next-btn" 
            data-code="${service.code}" 
            ${!hasNext ? "disabled" : ""}
          >
            Panggil Berikutnya
          </button>
          ${!hasNext
                ? `<div style="font-size: 0.75rem; color: #94a3b8; text-align: center; margin-top: 0.35rem;">Tidak ada tiket menunggu untuk jenis antrian ini.</div>`
                : ""}
        </div>

        <div class="operator-card-actions">
          <button 
            class="btn btn-secondary btn-sm skip-btn" 
            data-code="${service.code}" 
            data-ticket-id="${currentlyCalled ? currentlyCalled.id : ""}"
            ${!hasCurrent ? "disabled" : ""}
          >
            Lewati
          </button>
          <button 
            class="btn btn-secondary btn-sm complete-btn" 
            data-code="${service.code}" 
            ${!hasCurrent ? "disabled" : ""}
          >
            Selesai
          </button>
        </div>
      `;
            // Event listener: Panggil Berikutnya
            const callNextBtn = card.querySelector(".call-next-btn");
            if (callNextBtn && hasNext) {
                callNextBtn.addEventListener("click", () => {
                    const res = StorageService.callNextTicket(service.code);
                    if (res.calledTicket) {
                        AudioService.announceQueue(res.calledTicket.ticketNumber, res.calledTicket.serviceName);
                    }
                    renderOperatorCards();
                });
            }
            // Event listener: Lewati
            const skipBtn = card.querySelector(".skip-btn");
            if (skipBtn && hasCurrent && currentlyCalled) {
                skipBtn.addEventListener("click", () => {
                    StorageService.skipTicket(currentlyCalled.id);
                    renderOperatorCards();
                });
            }
            // Event listener: Selesai
            const completeBtn = card.querySelector(".complete-btn");
            if (completeBtn && hasCurrent) {
                completeBtn.addEventListener("click", () => {
                    StorageService.completeCurrentTicket(service.code);
                    renderOperatorCards();
                });
            }
            cardsContainer.appendChild(card);
        });
    }
    // Render awal
    renderOperatorCards();
    // Sinkronisasi realtime
    StorageService.onStorageChange(() => {
        renderOperatorCards();
    });
    // Polling interval 2.5 detik sebagai fallback
    setInterval(() => {
        renderOperatorCards();
    }, 2500);
});
