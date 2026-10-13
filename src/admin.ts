import { AuthService } from "./services/auth.js";
import { StorageService } from "./services/storage.js";
import { AudioService } from "./services/audio.js";
import type { PriorityLevel } from "./types/index.js";

document.addEventListener("DOMContentLoaded", () => {
  StorageService.init();

  // Auth & Role Guard: Khusus Admin dan Moderator
  const session = AuthService.requireAuth(["admin", "moderator"]);
  if (!session) return;

  // Render User Info di Navbar
  const navUserEl = document.getElementById("navUser");
  const navRoleEl = document.getElementById("navRole");
  if (navUserEl) navUserEl.textContent = session.firstName || session.username;
  if (navRoleEl) {
    navRoleEl.textContent = session.role.toUpperCase();
    navRoleEl.className = `role-pill role-${session.role}`;
  }

  // Logout Handler
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      AuthService.logout();
    });
  }

  // Reset Antrian Handler
  const resetQueueBtn = document.getElementById("resetQueueBtn");
  if (resetQueueBtn) {
    resetQueueBtn.addEventListener("click", () => {
      const confirmReset = window.confirm(
        "Apakah Anda yakin ingin MERESET seluruh antrian hari ini? Seluruh nomor antrian akan dikosongkan dan penomoran akan kembali dari awal."
      );
      if (confirmReset) {
        StorageService.resetQueue();
        renderAll();
        showNotification("Antrian berhasil direset ke awal.", "success");
      }
    });
  }

  // Form Tambah Jenis Antrian
  const addServiceForm = document.getElementById("addServiceForm") as HTMLFormElement | null;
  const serviceCodeInput = document.getElementById("serviceCode") as HTMLInputElement | null;
  const serviceNameInput = document.getElementById("serviceName") as HTMLInputElement | null;
  const serviceErrorEl = document.getElementById("serviceError") as HTMLDivElement | null;

  if (addServiceForm && serviceCodeInput && serviceNameInput) {
    addServiceForm.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      if (serviceErrorEl) serviceErrorEl.style.display = "none";

      const code = serviceCodeInput.value.trim().toUpperCase();
      const name = serviceNameInput.value.trim();

      const result = StorageService.addService(code, name);
      if (!result.success) {
        if (serviceErrorEl) {
          serviceErrorEl.textContent = result.message || "Gagal menambah jenis antrian.";
          serviceErrorEl.style.display = "block";
        }
        return;
      }

      // Reset form
      serviceCodeInput.value = "";
      serviceNameInput.value = "";
      renderAll();
      showNotification(`Layanan '${name}' (${code}) berhasil ditambahkan.`, "success");
    });
  }

  // Form Penerbitan Tiket Manual
  const issueTicketForm = document.getElementById("issueTicketForm") as HTMLFormElement | null;
  const issueServiceSelect = document.getElementById("issueService") as HTMLSelectElement | null;
  const issuePrioritySelect = document.getElementById("issuePriority") as HTMLSelectElement | null;
  const issueResultEl = document.getElementById("issueResult") as HTMLDivElement | null;

  if (issueTicketForm && issueServiceSelect && issuePrioritySelect) {
    issueTicketForm.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      if (issueResultEl) issueResultEl.style.display = "none";

      const serviceCode = issueServiceSelect.value;
      const priority = issuePrioritySelect.value as PriorityLevel;

      if (!serviceCode) {
        alert("Pilih jenis antrian terlebih dahulu.");
        return;
      }

      const res = StorageService.createTicket(serviceCode, priority);
      if (!res.success || !res.ticket) {
        alert(res.message || "Gagal menerbitkan tiket.");
        return;
      }

      renderAll();
      showNotification(
        `Tiket ${res.ticket.ticketNumber} (${res.ticket.serviceName}) prioritas ${res.ticket.priority} berhasil diterbitkan.`,
        "success"
      );
    });
  }

  // ==================== RENDERING FUNCTIONS ====================

  function renderServices(): void {
    const listContainer = document.getElementById("servicesList");
    if (!listContainer) return;

    const services = StorageService.getServices();
    listContainer.innerHTML = "";

    if (services.length === 0) {
      listContainer.innerHTML = `<div class="text-muted" style="padding: 1rem 0; font-size: 0.85rem;">Belum ada jenis antrian yang terdaftar.</div>`;
      return;
    }

    services.forEach((service) => {
      const waitingCount = StorageService.getWaitingCount(service.code);

      const row = document.createElement("div");
      row.className = "admin-service-row";

      const statusBadge = service.isActive
        ? `<span class="badge" style="background:var(--status-success-subtle); color:#6ee7b7; border:1px solid rgba(16,185,129,0.35);">Aktif</span>`
        : `<span class="badge" style="background:rgba(255,255,255,0.06); color:var(--text-faint); border:1px solid rgba(255,255,255,0.12);">Nonaktif</span>`;

      row.innerHTML = `
        <div class="service-meta">
          <h4>
            <span>${service.name}</span>
            <span style="font-family: var(--font-heading); color: var(--accent-cyan); font-size: 1.15rem; margin-left: 0.35rem;">(${service.code})</span>
            ${statusBadge}
          </h4>
          <p>${waitingCount} tiket menunggu</p>
        </div>
        <div style="display: flex; gap: 0.4rem; align-items: center;">
          <button class="btn btn-secondary btn-sm toggle-btn" data-id="${service.id}">
            ${service.isActive ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${service.id}" data-name="${service.name}">
            Hapus
          </button>
        </div>
      `;

      // Event listener toggle status
      row.querySelector(".toggle-btn")?.addEventListener("click", () => {
        StorageService.toggleServiceStatus(service.id);
        renderAll();
      });

      // Event listener delete service
      row.querySelector(".delete-btn")?.addEventListener("click", () => {
        const confirmDelete = window.confirm(
          `Hapus jenis antrian '${service.name}' (${service.code})? Tiket terkait tidak akan dihapus.`
        );
        if (confirmDelete) {
          StorageService.deleteService(service.id);
          renderAll();
          showNotification(`Jenis antrian '${service.name}' telah dihapus.`, "info");
        }
      });

      listContainer.appendChild(row);
    });

    // Perbarui dropdown form penerbitan tiket (hanya yang aktif)
    if (issueServiceSelect) {
      const activeServices = StorageService.getActiveServices();
      const currentSelected = issueServiceSelect.value;
      issueServiceSelect.innerHTML = `<option value="">Pilih jenis antrian</option>`;
      activeServices.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.code;
        opt.textContent = `${s.name} (${s.code})`;
        if (s.code === currentSelected) {
          opt.selected = true;
        }
        issueServiceSelect.appendChild(opt);
      });
    }
  }

  function renderTicketGroups(): void {
    const container = document.getElementById("ticketGroupsContainer");
    if (!container) return;

    const services = StorageService.getServices();
    const tickets = StorageService.getTickets();
    container.innerHTML = "";

    services.forEach((service) => {
      const serviceTickets = tickets.filter(
        (t) => t.serviceCode.toUpperCase() === service.code.toUpperCase()
      );

      // Jangan tampilkan grup jika tidak ada tiket sama sekali
      if (serviceTickets.length === 0) return;

      const groupEl = document.createElement("div");
      groupEl.className = "admin-ticket-group";

      const headerHtml = `
        <div style="font-family: var(--font-body); font-weight: 700; font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.65rem; letter-spacing: 0.3em;">
          LAYANAN • ${service.name}
        </div>
      `;

      let itemsHtml = "";
      // Urutkan tiket: yang dipanggil di atas, lalu menunggu (urut prioritas), lalu selesai/dilewati
      const sortedTickets = [...serviceTickets].sort((a, b) => {
        const statusRank: Record<string, number> = {
          Dipanggil: 1,
          Menunggu: 2,
          Dilewati: 3,
          Selesai: 4
        };
        const rankDiff = (statusRank[a.status] || 99) - (statusRank[b.status] || 99);
        if (rankDiff !== 0) return rankDiff;
        return a.createdAt - b.createdAt;
      });

      sortedTickets.forEach((t) => {
        let actionButtons = "";

        if (t.status === "Dipanggil") {
          actionButtons = `
            <button class="btn btn-secondary btn-sm complete-btn" data-code="${t.serviceCode}">
              Selesai
            </button>
          `;
        } else if (t.status === "Menunggu") {
          actionButtons = `
            <button class="btn btn-secondary btn-sm call-btn" data-code="${t.serviceCode}">
              Panggil
            </button>
            <button class="btn btn-secondary btn-sm skip-btn" data-id="${t.id}">
              Lewati
            </button>
          `;
        } else if (t.status === "Dilewati") {
          actionButtons = `
            <button class="btn btn-secondary btn-sm call-btn" data-code="${t.serviceCode}">
              Panggil
            </button>
          `;
        }

        const priorityBadgeClass = `badge-priority-${t.priority.toLowerCase()}`;

        itemsHtml += `
          <div class="ticket-item-row">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <strong style="font-size: 0.95rem; min-width: 60px;">${t.ticketNumber}</strong>
              <span class="badge ${priorityBadgeClass}">${t.priority}</span>
              <span class="text-muted" style="font-size: 0.8rem;">${t.status}</span>
            </div>
            <div style="display: flex; gap: 0.35rem;">
              ${actionButtons}
            </div>
          </div>
        `;
      });

      groupEl.innerHTML = headerHtml + itemsHtml;

      // Event listener tombol aksi
      groupEl.querySelectorAll(".complete-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const code = btn.getAttribute("data-code");
          if (code) {
            StorageService.completeCurrentTicket(code);
            renderAll();
          }
        });
      });

      groupEl.querySelectorAll(".call-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const code = btn.getAttribute("data-code");
          if (code) {
            const res = StorageService.callNextTicket(code);
            if (res.calledTicket) {
              AudioService.announceQueue(res.calledTicket.ticketNumber, res.calledTicket.serviceName);
            }
            renderAll();
          }
        });
      });

      groupEl.querySelectorAll(".skip-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          if (id) {
            StorageService.skipTicket(id);
            renderAll();
          }
        });
      });

      container.appendChild(groupEl);
    });
  }

  function renderAll(): void {
    renderServices();
    renderTicketGroups();
  }

  function showNotification(message: string, type: "success" | "info" | "danger" = "info"): void {
    const notifContainer = document.getElementById("toastContainer");
    if (!notifContainer) return;

    const notif = document.createElement("div");
    notif.className = `alert alert-${type}`;
    notif.textContent = message;
    notif.style.marginBottom = "0.5rem";
    notifContainer.appendChild(notif);

    setTimeout(() => {
      notif.remove();
    }, 3500);
  }

  // Render awal
  renderAll();

  // Sinkronisasi real-time antar-tab
  StorageService.onStorageChange(() => {
    renderAll();
  });
});
