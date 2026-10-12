export type PriorityLevel = "VIP" | "Disabilitas" | "Lansia" | "Normal";

export type TicketStatus = "Menunggu" | "Dipanggil" | "Selesai" | "Dilewati";

export interface ServiceType {
  id: string;
  code: string; // 1 uppercase letter, e.g. "A", "B", "C"
  name: string; // e.g. "Umum-1", "Poli Gigi", "Farmasi"
  isActive: boolean;
  createdAt: number;
}

export interface QueueTicket {
  id: string;
  ticketNumber: string; // Format: Code-Number 3 digit, e.g. "A-001"
  serviceCode: string;
  serviceName: string;
  priority: PriorityLevel;
  status: TicketStatus;
  createdAt: number;
  calledAt?: number;
  completedAt?: number;
}

export interface CreateServiceInput {
  code: string;
  name: string;
}

export interface CreateTicketInput {
  serviceCode: string;
  priority: PriorityLevel;
}
