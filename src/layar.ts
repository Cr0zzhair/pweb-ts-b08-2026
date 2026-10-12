import { StorageService } from "./services/storage.js";
import { AudioService } from "./services/audio.js";
import { AuthService } from "./services/auth.js";

document.addEventListener("DOMContentLoaded", () => {
  StorageService.init();

  // Cek sesi login untuk navigasi kembali ke dashboard admin/operator
  const session = AuthService.getCurrentSession();
  const navAdminLink = document.getElementById("navAdminLink");
  const navOperatorLink = document.getElementById("navOperatorLink");
  const authNavArea = document.getElementById("authNavArea");

  if (session) {
    if (navOperatorLink) navOperatorLink.style.display = "inline-block";
    if (session.role === "admin" || session.role === "moderator") {
      if (navAdminLink) navAdminLink.style.display = "inline-block";
    }

    if (authNavArea) {
      const isPrivileged = session.role === "admin" || session.role === "moderator";
      const targetUrl = isPrivileged ? "index.html" : "operator.html";
      const targetLabel = isPrivileged ? "Dashboard Admin" : "Panel Operator";

      authNavArea.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div class="user-badge">
            <span>${session.firstName || session.username}</span>
            <span class="role-pill role-${session.role}">${session.role.toUpperCase()}</span>
          </div>
          <a href="${targetUrl}" class="btn btn-primary btn-sm" style="text-decoration: none;">
            &larr; Ke ${targetLabel}
          </a>
        </div>
      `;
    }
  }

  const monitorCardsContainer = document.getElementById("monitorCardsContainer");
  const lastUpdatedEl = document.getElementById("lastUpdated");
  const fullscreenToggleBtn = document.getElementById("fullscreenToggleBtn") as HTMLButtonElement | null;
  const soundToggleBtn = document.getElementById("soundToggleBtn") as HTMLButtonElement | null;

  let lastProcessedCallTimestamp = 0;

  // Inisialisasi timestamp panggilan terakhir agar tidak membunyikan audio lama saat halaman baru dibuka
  const initialCall = StorageService.getLastCallEvent();
  if (initialCall) {
    lastProcessedCallTimestamp = initialCall.timestamp;
  }

  // Live Clock & Last Updated
  function updateTimestampDisplay(): void {
    if (!lastUpdatedEl) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    lastUpdatedEl.textContent = `Diperbarui ${timeStr}`;
  }

  // Audio Toggle
  function updateSoundButton(): void {
    if (!soundToggleBtn) return;
    const enabled = AudioService.isEnabled();
    soundToggleBtn.textContent = enabled ? "🔊 Suara: Aktif" : "🔇 Suara: Mati";
  }

  if (soundToggleBtn) {
    updateSoundButton();
    soundToggleBtn.addEventListener("click", () => {
      AudioService.setEnabled(!AudioService.isEnabled());
      updateSoundButton();
    });
  }

  // Fullscreen API Toggle
  if (fullscreenToggleBtn) {
    fullscreenToggleBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn("Fullscreen request error:", err);
        });
      } else {
        document.exitFullscreen().catch((err) => {
          console.warn("Exit fullscreen error:", err);
        });
      }
    });

    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement) {
        fullscreenToggleBtn.textContent = "Keluar Layar Penuh";
      } else {
        fullscreenToggleBtn.textContent = "Layar Penuh";
      }
    });
  }

  // Periksa apakah ada panggilan antrian baru untuk dibunyikan audionya
  function checkAndPlayNewCall(): void {
    const lastEvent = StorageService.getLastCallEvent();
    if (lastEvent && lastEvent.timestamp > lastProcessedCallTimestamp) {
      lastProcessedCallTimestamp = lastEvent.timestamp;
      AudioService.announceQueue(lastEvent.ticketNumber, lastEvent.serviceName);
    }
  }

  // Render Monitor Cards
  function renderMonitorCards(): void {
    if (!monitorCardsContainer) return;

    const services = StorageService.getActiveServices();
    monitorCardsContainer.innerHTML = "";
    updateTimestampDisplay();

    if (services.length === 0) {
      monitorCardsContainer.innerHTML = `
        <div class="monitor-card" style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
          <h2 style="color: var(--text-muted);">Tidak ada layanan antrian aktif</h2>
          <p style="color: var(--text-light); font-size: 0.9rem; margin-top: 0.5rem;">
            Layanan antrian rumah sakit akan tampil di sini saat diaktifkan oleh Admin.
          </p>
        </div>
      `;
      return;
    }

    services.forEach((service) => {
      const waitingCount = StorageService.getWaitingCount(service.code);
      const currentlyCalled = StorageService.getCurrentlyCalled(service.code);

      const card = document.createElement("div");
      card.className = "monitor-card";

      let centerContent = "";
      if (currentlyCalled) {
        card.classList.add("is-calling");
        centerContent = `
          <div class="monitor-card-badge">DIPANGGIL</div>
          <div class="monitor-card-number">${currentlyCalled.ticketNumber}</div>
        `;
      } else {
        centerContent = `
          <div class="monitor-empty-state">Belum ada nomor dipanggil</div>
          <div class="monitor-empty-sub">Nomor akan muncul setelah operator memanggil tiket.</div>
        `;
      }

      card.innerHTML = `
        <div class="monitor-card-header">
          <span>${service.name}</span>
          <span class="monitor-card-code">${service.code}</span>
        </div>

        <div class="monitor-card-center">
          ${centerContent}
        </div>

        <div class="monitor-card-footer">
          ${waitingCount} tiket menunggu
        </div>
      `;

      monitorCardsContainer.appendChild(card);
    });
  }

  // Render awal
  renderMonitorCards();

  // Sinkronisasi realtime saat ada event storage di tab lain
  StorageService.onStorageChange(() => {
    checkAndPlayNewCall();
    renderMonitorCards();
  });

  // Polling interval 2-3 detik sesuai spesifikasi PDF (2500ms)
  setInterval(() => {
    checkAndPlayNewCall();
    renderMonitorCards();
  }, 2500);
});
