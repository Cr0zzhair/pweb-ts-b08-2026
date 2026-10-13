import { StorageService } from "./services/storage.js";
import { AudioService } from "./services/audio.js";
import { AuthService } from "./services/auth.js";
document.addEventListener("DOMContentLoaded", () => {
    StorageService.init();
    // Auth Guard: Semua user harus login untuk mengambil antrian (revisi requirement)
    const session = AuthService.requireAuth();
    if (!session)
        return;
    const navAdminLink = document.getElementById("navAdminLink");
    const navOperatorLink = document.getElementById("navOperatorLink");
    const authNavArea = document.getElementById("authNavArea");
    if (navOperatorLink) {
        // Hanya admin/moderator yang bisa akses operator
        if (session.role === "admin" || session.role === "moderator") {
            navOperatorLink.style.display = "inline-block";
        }
    }
    if (session.role === "admin" || session.role === "moderator") {
        if (navAdminLink)
            navAdminLink.style.display = "inline-block";
    }
    if (authNavArea) {
        const isPrivileged = session.role === "admin" || session.role === "moderator";
        const targetUrl = isPrivileged ? "index.html" : "layar.html";
        const targetLabel = isPrivileged ? "Dashboard Admin" : "Layar Antrian";
        authNavArea.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <div class="user-badge">
          <span>${session.firstName || session.username}</span>
          <span class="role-pill role-${session.role}">${session.role.toUpperCase()}</span>
        </div>
        <a href="${targetUrl}" class="btn btn-primary btn-sm" style="text-decoration: none;">
          &larr; Ke ${targetLabel}
        </a>
        <button id="logoutBtnAmbil" class="btn btn-secondary btn-sm">Keluar</button>
      </div>
    `;
        const logoutBtnAmbil = document.getElementById("logoutBtnAmbil");
        if (logoutBtnAmbil) {
            logoutBtnAmbil.addEventListener("click", () => {
                AuthService.logout();
            });
        }
    }
    const kioskCardsContainer = document.getElementById("kioskCardsContainer");
    const fullscreenToggleBtn = document.getElementById("fullscreenToggleBtn");
    // Modal Cetak Tiket Elements
    const ticketModal = document.getElementById("ticketModal");
    const modalTicketNumber = document.getElementById("modalTicketNumber");
    const modalServiceName = document.getElementById("modalServiceName");
    const modalPriority = document.getElementById("modalPriority");
    const modalDateTime = document.getElementById("modalDateTime");
    const modalWaitingAhead = document.getElementById("modalWaitingAhead");
    const printTicketBtn = document.getElementById("printTicketBtn");
    const closeModalBtn = document.getElementById("closeModalBtn");
    // Fullscreen API Toggle
    if (fullscreenToggleBtn) {
        fullscreenToggleBtn.addEventListener("click", () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch((err) => {
                    console.warn("Fullscreen error:", err);
                });
            }
            else {
                document.exitFullscreen().catch((err) => {
                    console.warn("Exit fullscreen error:", err);
                });
            }
        });
        document.addEventListener("fullscreenchange", () => {
            if (document.fullscreenElement) {
                fullscreenToggleBtn.textContent = "Keluar Layar Penuh";
            }
            else {
                fullscreenToggleBtn.textContent = "Layar Penuh";
            }
        });
    }
    function showTicketModal(ticket) {
        if (!ticketModal)
            return;
        if (modalTicketNumber)
            modalTicketNumber.textContent = ticket.ticketNumber;
        if (modalServiceName)
            modalServiceName.textContent = ticket.serviceName;
        if (modalPriority)
            modalPriority.textContent = ticket.priority;
        const date = new Date(ticket.createdAt);
        const dateStr = date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
        const timeStr = date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });
        if (modalDateTime)
            modalDateTime.textContent = `${dateStr}, ${timeStr} WIB`;
        const waitingTotal = StorageService.getWaitingCount(ticket.serviceCode);
        const waitingAhead = Math.max(0, waitingTotal - 1);
        if (modalWaitingAhead) {
            modalWaitingAhead.textContent = `${waitingAhead} orang di depan Anda`;
        }
        ticketModal.classList.add("open");
        // Efek audio kecil tanda tiket tercetak
        AudioService.playChime();
    }
    function closeTicketModal() {
        if (!ticketModal)
            return;
        ticketModal.classList.remove("open");
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            closeTicketModal();
        });
    }
    if (printTicketBtn) {
        printTicketBtn.addEventListener("click", () => {
            window.print();
        });
    }
    // Tutup modal jika klik di luar area kartu
    if (ticketModal) {
        ticketModal.addEventListener("click", (e) => {
            if (e.target === ticketModal) {
                closeTicketModal();
            }
        });
    }
    function handleTakeTicket(serviceCode, priority) {
        const res = StorageService.createTicket(serviceCode, priority);
        if (!res.success || !res.ticket) {
            alert(res.message || "Gagal mengambil nomor antrian.");
            return;
        }
        showTicketModal(res.ticket);
        renderKioskCards();
    }
    // Render Kiosk Cards
    function renderKioskCards() {
        if (!kioskCardsContainer)
            return;
        const services = StorageService.getActiveServices();
        kioskCardsContainer.innerHTML = "";
        if (services.length === 0) {
            kioskCardsContainer.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
          <div class="card-eyebrow">STATUS SISTEM</div>
          <h2 style="color: var(--text-muted); font-size: 1.75rem;">Tidak ada layanan yang tersedia saat ini</h2>
          <p style="color: var(--text-faint); font-size: 0.9rem; margin-top: 0.5rem;">
            Silakan hubungi bagian informasi rumah sakit.
          </p>
        </div>
      `;
            return;
        }
        services.forEach((service) => {
            const card = document.createElement("div");
            card.className = "kiosk-card";
            card.innerHTML = `
        <div>
          <div class="kiosk-card-eyebrow">POLIKLINIK</div>
          <div class="kiosk-card-header">
            <span>${service.name}</span>
            <span>${service.code}</span>
          </div>
        </div>

        <div>
          <button class="btn btn-primary btn-block take-normal-btn" data-code="${service.code}">
            Ambil Nomor
          </button>
        </div>

        <div>
          <div class="kiosk-priority-label">▾ Ambil dengan prioritas:</div>
          <div class="kiosk-priority-buttons">
            <button class="btn btn-secondary take-priority-btn" data-code="${service.code}" data-priority="Lansia">
              Lansia
            </button>
            <button class="btn btn-secondary take-priority-btn" data-code="${service.code}" data-priority="Disabilitas">
              Disabilitas
            </button>
            <button class="btn btn-secondary take-priority-btn" data-code="${service.code}" data-priority="VIP">
              VIP
            </button>
          </div>
        </div>
      `;
            // Event listener: Ambil nomor normal
            card.querySelector(".take-normal-btn")?.addEventListener("click", () => {
                handleTakeTicket(service.code, "Normal");
            });
            // Event listener: Ambil nomor dengan prioritas khusus
            card.querySelectorAll(".take-priority-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const priority = btn.getAttribute("data-priority");
                    if (priority) {
                        handleTakeTicket(service.code, priority);
                    }
                });
            });
            kioskCardsContainer.appendChild(card);
        });
    }
    // Render awal
    renderKioskCards();
    // Sinkronisasi realtime otomatis saat admin menambah/mengubah layanan (tanpa reload manual)
    StorageService.onStorageChange(() => {
        renderKioskCards();
    });
    // Polling interval 2-3 detik sesuai requirement PDF
    setInterval(() => {
        renderKioskCards();
    }, 2500);
});
