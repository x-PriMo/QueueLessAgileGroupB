export type Role = 'USER' | 'WORKER' | 'OWNER' | 'PLATFORM_ADMIN';

export interface SessionUser {
  id: number;
  email: string;
  role: Role; // global rola; dodatkowo role per firma w tabeli members
}

export interface Service {
  id: number;
  companyId: number;
  name: string;
  durationMinutes: number;
  price: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerService {
  id: number;
  workerId: number;
  serviceId: number;
  canPerform: boolean;
  createdAt: string;
}

export interface Reservation {
  id: number;
  companyId: number;
  email: string;
  customerName?: string;
  phone?: string;
  date: string;
  startTime: string;
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED';
  serviceId?: number;
  workerId?: number;
  createdAt?: string;
  updatedAt?: string;
}

