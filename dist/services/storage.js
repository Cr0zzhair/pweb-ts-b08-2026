const STORAGE_KEYS = {
    AUTH_SESSION: "hospital_auth_session",
    SERVICES: "hospital_services",
    TICKETS: "hospital_tickets",
    COUNTERS: "hospital_counters",
    LAST_CALLED: "hospital_last_called_event"
};
const PRIORITY_WEIGHT = {
    VIP: 1,
    Disabilitas: 2,
    Lansia: 3,
    Normal: 4
};
export class StorageService {
    /**
     * Inisialisasi data awal (seeding) jika Local Storage masih kosong
     */
    static init() {
        if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
            this.seedDefaultData();
        }
    }
    static seedDefaultData() {
        const defaultServices = [
            { id: "srv-a", code: "A", name: "UMUM-1", isActive: true, createdAt: Date.now() - 100000 },
            { id: "srv-b", code: "B", name: "UMUM-2", isActive: true, createdAt: Date.now() - 90000 },
            { id: "srv-c", code: "C", name: "UMUM-3", isActive: true, createdAt: Date.now() - 80000 },
            { id: "srv-g", code: "G", name: "GIGI", isActive: true, createdAt: Date.now() - 70000 },
            { id: "srv-f", code: "F", name: "FARMASI", isActive: true, createdAt: Date.now() - 60000 },
            { id: "srv-p", code: "P", name: "PSIKOLOG", isActive: true, createdAt: Date.now() - 50000 }
        ];
        const defaultCounters = {
            A: 1,
            B: 4,
            C: 1,
            G: 3,
            F: 1,
            P: 1
        };
        const now = Date.now();
        const defaultTickets = [
            // UMUM-1: A-001 sedang dipanggil
            {
                id: "t-a1",
                ticketNumber: "A-001",
                serviceCode: "A",
                serviceName: "UMUM-1",
                priority: "Normal",
                status: "Dipanggil",
                createdAt: now - 300000,
                calledAt: now - 60000
            },
            // UMUM-2: B-001 selesai, B-002, B-003, B-004 menunggu
            {
                id: "t-b1",
                ticketNumber: "B-001",
                serviceCode: "B",
                serviceName: "UMUM-2",
                priority: "Normal",
                status: "Selesai",
                createdAt: now - 280000,
                calledAt: now - 200000,
                completedAt: now - 150000
            },
            {
                id: "t-b2",
                ticketNumber: "B-002",
                serviceCode: "B",
                serviceName: "UMUM-2",
                priority: "Normal",
                status: "Menunggu",
                createdAt: now - 260000
            },
            {
                id: "t-b3",
                ticketNumber: "B-003",
                serviceCode: "B",
                serviceName: "UMUM-2",
                priority: "Disabilitas",
                status: "Menunggu",
                createdAt: now - 240000
            },
            {
                id: "t-b4",
                ticketNumber: "B-004",
                serviceCode: "B",
                serviceName: "UMUM-2",
                priority: "Disabilitas",
                status: "Menunggu",
                createdAt: now - 220000
            },
            // UMUM-3: C-001 menunggu
            {
                id: "t-c1",
                ticketNumber: "C-001",
                serviceCode: "C",
                serviceName: "UMUM-3",
                priority: "Normal",
                status: "Menunggu",
                createdAt: now - 200000
            },
            // GIGI: G-003 sedang dipanggil (Lansia), G-001 & G-002 menunggu
            {
                id: "t-g1",
                ticketNumber: "G-001",
                serviceCode: "G",
                serviceName: "GIGI",
                priority: "Normal",
                status: "Menunggu",
                createdAt: now - 180000
            },
            {
                id: "t-g2",
                ticketNumber: "G-002",
                serviceCode: "G",
                serviceName: "GIGI",
                priority: "Normal",
                status: "Menunggu",
                createdAt: now - 170000
            },
            {
                id: "t-g3",
                ticketNumber: "G-003",
                serviceCode: "G",
                serviceName: "GIGI",
                priority: "Lansia",
                status: "Dipanggil",
                createdAt: now - 160000,
                calledAt: now - 30000
            },
            // FARMASI: F-001 sedang dipanggil
            {
                id: "t-f1",
                ticketNumber: "F-001",
                serviceCode: "F",
                serviceName: "FARMASI",
                priority: "Normal",
                status: "Dipanggil",
                createdAt: now - 150000,
                calledAt: now - 40000
            },
            // PSIKOLOG: P-001 menunggu
            {
                id: "t-p1",
                ticketNumber: "P-001",
                serviceCode: "P",
                serviceName: "PSIKOLOG",
                priority: "Normal",
                status: "Menunggu",
                createdAt: now - 140000
            }
        ];
        this.saveServices(defaultServices);
        this.saveCounters(defaultCounters);
        this.saveTickets(defaultTickets);
    }
    // ==================== AUTH SESSION ====================
    static getSession() {
        const raw = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    static saveSession(session) {
        localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
    }
    static clearSession() {
        localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    }
    // ==================== SERVICES ====================
    static getServices() {
        const raw = localStorage.getItem(STORAGE_KEYS.SERVICES);
        if (!raw)
            return [];
        try {
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    static getActiveServices() {
        return this.getServices().filter((s) => s.isActive);
    }
    static getServiceByCode(code) {
        const upper = code.trim().toUpperCase();
        return this.getServices().find((s) => s.code.toUpperCase() === upper);
    }
    static saveServices(services) {
        localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
        this.triggerStorageEvent();
    }
    static addService(code, name) {
        const cleanCode = code.trim().toUpperCase();
        const cleanName = name.trim();
        if (!cleanCode || !cleanName) {
            return { success: false, message: "Kode dan Nama Layanan wajib diisi." };
        }
        if (!/^[A-Z]$/.test(cleanCode)) {
            return { success: false, message: "Kode harus berupa tepat 1 huruf kapital (A-Z)." };
        }
        const currentServices = this.getServices();
        // Validasi duplikasi kode (case-insensitive)
        const duplicateCode = currentServices.some((s) => s.code.toUpperCase() === cleanCode);
        if (duplicateCode) {
            return { success: false, message: `Kode antrian '${cleanCode}' sudah digunakan.` };
        }
        // Validasi duplikasi nama (case-insensitive)
        const duplicateName = currentServices.some((s) => s.name.trim().toLowerCase() === cleanName.toLowerCase());
        if (duplicateName) {
            return { success: false, message: `Nama layanan '${cleanName}' sudah terdaftar.` };
        }
        const newService = {
            id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            code: cleanCode,
            name: cleanName,
            isActive: true,
            createdAt: Date.now()
        };
        currentServices.push(newService);
        this.saveServices(currentServices);
        return { success: true, service: newService };
    }
    static toggleServiceStatus(id) {
        const services = this.getServices();
        const service = services.find((s) => s.id === id);
        if (!service)
            return false;
        service.isActive = !service.isActive;
        this.saveServices(services);
        return true;
    }
    static deleteService(id) {
        const services = this.getServices();
        const filtered = services.filter((s) => s.id !== id);
        if (filtered.length === services.length)
            return false;
        this.saveServices(filtered);
        return true;
    }
    // ==================== COUNTERS ====================
    static getCounters() {
        const raw = localStorage.getItem(STORAGE_KEYS.COUNTERS);
        if (!raw)
            return {};
        try {
            return JSON.parse(raw);
        }
        catch {
            return {};
        }
    }
    static saveCounters(counters) {
        localStorage.setItem(STORAGE_KEYS.COUNTERS, JSON.stringify(counters));
    }
    static getNextNumberForCode(code) {
        const counters = this.getCounters();
        const upper = code.toUpperCase();
        const next = (counters[upper] ?? 0) + 1;
        counters[upper] = next;
        this.saveCounters(counters);
        return next;
    }
    // ==================== TICKETS ====================
    static getTickets() {
        const raw = localStorage.getItem(STORAGE_KEYS.TICKETS);
        if (!raw)
            return [];
        try {
            return JSON.parse(raw);
        }
        catch {
            return [];
        }
    }
    static saveTickets(tickets) {
        localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
        this.triggerStorageEvent();
    }
    static getTicketsByService(serviceCode) {
        const upper = serviceCode.toUpperCase();
        return this.getTickets().filter((t) => t.serviceCode.toUpperCase() === upper);
    }
    static createTicket(serviceCode, priority) {
        const service = this.getServiceByCode(serviceCode);
        if (!service) {
            return { success: false, message: "Jenis antrian tidak ditemukan." };
        }
        if (!service.isActive) {
            return { success: false, message: `Layanan ${service.name} saat ini sedang dinonaktifkan.` };
        }
        const nextNumber = this.getNextNumberForCode(service.code);
        const formattedNumber = `${service.code}-${String(nextNumber).padStart(3, "0")}`;
        const newTicket = {
            id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ticketNumber: formattedNumber,
            serviceCode: service.code,
            serviceName: service.name,
            priority,
            status: "Menunggu",
            createdAt: Date.now()
        };
        const tickets = this.getTickets();
        tickets.push(newTicket);
        this.saveTickets(tickets);
        return { success: true, ticket: newTicket };
    }
    static getCurrentlyCalled(serviceCode) {
        const upper = serviceCode.toUpperCase();
        return this.getTickets().find((t) => t.serviceCode.toUpperCase() === upper && t.status === "Dipanggil");
    }
    /**
     * Mengambil tiket berikutnya berdasarkan prioritas:
     * VIP (1) > Disabilitas (2) > Lansia (3) > Normal (4)
     * Jika prioritas sama, urutkan berdasarkan waktu pendaftaran (createdAt ascending).
     */
    static getNextTicket(serviceCode) {
        const upper = serviceCode.toUpperCase();
        const waitingTickets = this.getTickets().filter((t) => t.serviceCode.toUpperCase() === upper && t.status === "Menunggu");
        if (waitingTickets.length === 0)
            return undefined;
        waitingTickets.sort((a, b) => {
            const weightA = PRIORITY_WEIGHT[a.priority];
            const weightB = PRIORITY_WEIGHT[b.priority];
            if (weightA !== weightB) {
                return weightA - weightB; // Prioritas lebih tinggi (angka lebih kecil) didahulukan
            }
            return a.createdAt - b.createdAt; // FIFO
        });
        return waitingTickets[0];
    }
    static getWaitingCount(serviceCode) {
        const upper = serviceCode.toUpperCase();
        return this.getTickets().filter((t) => t.serviceCode.toUpperCase() === upper && t.status === "Menunggu").length;
    }
    static callNextTicket(serviceCode) {
        const tickets = this.getTickets();
        const upper = serviceCode.toUpperCase();
        // 1. Selesaikan tiket aktif saat ini jika ada
        let prev;
        for (const t of tickets) {
            if (t.serviceCode.toUpperCase() === upper && t.status === "Dipanggil") {
                t.status = "Selesai";
                t.completedAt = Date.now();
                prev = t;
                break;
            }
        }
        // 2. Cari antrian berikutnya berprioritas tertinggi
        const waitingTickets = tickets.filter((t) => t.serviceCode.toUpperCase() === upper && t.status === "Menunggu");
        if (waitingTickets.length === 0) {
            this.saveTickets(tickets);
            return {
                success: false,
                previousTicket: prev,
                message: "Tidak ada tiket menunggu untuk jenis antrian ini."
            };
        }
        waitingTickets.sort((a, b) => {
            const weightA = PRIORITY_WEIGHT[a.priority];
            const weightB = PRIORITY_WEIGHT[b.priority];
            if (weightA !== weightB) {
                return weightA - weightB;
            }
            return a.createdAt - b.createdAt;
        });
        const target = waitingTickets[0];
        if (!target) {
            this.saveTickets(tickets);
            return { success: false, message: "Tiket tidak ditemukan." };
        }
        // Ubah status jadi Dipanggil
        target.status = "Dipanggil";
        target.calledAt = Date.now();
        this.saveTickets(tickets);
        // Kirim notifikasi event panggilan untuk audio/layar
        this.recordCallEvent(target);
        return {
            success: true,
            calledTicket: target,
            previousTicket: prev
        };
    }
    static completeCurrentTicket(serviceCode) {
        const tickets = this.getTickets();
        const upper = serviceCode.toUpperCase();
        let target;
        for (const t of tickets) {
            if (t.serviceCode.toUpperCase() === upper && t.status === "Dipanggil") {
                t.status = "Selesai";
                t.completedAt = Date.now();
                target = t;
                break;
            }
        }
        if (!target) {
            return { success: false, message: "Tidak ada tiket yang sedang dipanggil." };
        }
        this.saveTickets(tickets);
        return { success: true, completedTicket: target };
    }
    static skipTicket(ticketId) {
        const tickets = this.getTickets();
        const target = tickets.find((t) => t.id === ticketId);
        if (!target) {
            return { success: false, message: "Tiket tidak ditemukan." };
        }
        target.status = "Dilewati";
        this.saveTickets(tickets);
        return { success: true, skippedTicket: target };
    }
    static resetQueue() {
        // Kosongkan seluruh tiket dan reset counters ke 0
        this.saveTickets([]);
        this.saveCounters({});
        localStorage.removeItem(STORAGE_KEYS.LAST_CALLED);
        this.triggerStorageEvent();
    }
    // ==================== EVENTS & AUDIO SYNC ====================
    static recordCallEvent(ticket) {
        const eventPayload = {
            timestamp: Date.now(),
            ticketNumber: ticket.ticketNumber,
            serviceName: ticket.serviceName,
            serviceCode: ticket.serviceCode,
            priority: ticket.priority
        };
        localStorage.setItem(STORAGE_KEYS.LAST_CALLED, JSON.stringify(eventPayload));
    }
    static getLastCallEvent() {
        const raw = localStorage.getItem(STORAGE_KEYS.LAST_CALLED);
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    static triggerStorageEvent() {
        // Membangkitkan storage event pada tab yang sama bila diperlukan
        window.dispatchEvent(new Event("hospital_storage_updated"));
    }
    static onStorageChange(callback) {
        const handler = () => callback();
        window.addEventListener("storage", handler);
        window.addEventListener("hospital_storage_updated", handler);
        return () => {
            window.removeEventListener("storage", handler);
            window.removeEventListener("hospital_storage_updated", handler);
        };
    }
}
