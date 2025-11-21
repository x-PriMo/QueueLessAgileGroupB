export const API_URL = 'http://localhost:3001';

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

export interface ServiceSlot {
  startTime: string;
  endTime: string;
  availableWorkers: Array<{
    id: number;
    name: string;
    role: string;
    isTrainee: boolean;
  }>;
  isAvailable: boolean;
}

export interface ServiceSlotsResponse {
  slots: ServiceSlot[];
  serviceDuration: number;
  workingHours: {
    start: string;
    end: string;
  };
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return (await res.json()) as T;
}

// Funkcje API dla usług
export const servicesAPI = {
  // Pobierz wszystkie usługi dla firmy
  getServices: (companyId: number) => 
    api<{ services: Service[] }>(`/services/companies/${companyId}/services`),
  
  // Pobierz szczegóły usługi
  getService: (companyId: number, serviceId: number) => 
    api<{ service: Service }>(`/services/companies/${companyId}/services/${serviceId}`),
  
  // Utwórz nową usługę
  createService: (companyId: number, data: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) =>
    api<{ service: Service }>(`/services/companies/${companyId}/services`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // Aktualizuj usługę
  updateService: (companyId: number, serviceId: number, data: Partial<Service>) =>
    api<{ service: Service }>(`/services/companies/${companyId}/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  // Usuń usługę (soft delete)
  deleteService: (companyId: number, serviceId: number) =>
    api<void>(`/services/companies/${companyId}/services/${serviceId}`, {
      method: 'DELETE',
    }),
  
  // Pobierz usługi przypisane do pracownika
  getWorkerServices: (companyId: number, workerId: number) =>
    api<{ services: Service[] }>(`/services/companies/${companyId}/workers/${workerId}/services`),
  
  // Przypisz usługę do pracownika
  assignServiceToWorker: (companyId: number, workerId: number, serviceId: number) =>
    api<void>(`/services/companies/${companyId}/workers/${workerId}/services/${serviceId}`, {
      method: 'POST',
    }),
  
  // Usuń przypisanie usługi do pracownika
  unassignServiceFromWorker: (companyId: number, workerId: number, serviceId: number) =>
    api<void>(`/services/companies/${companyId}/workers/${workerId}/services/${serviceId}`, {
      method: 'DELETE',
    }),
  
  // Pobierz wolne sloty czasowe dla usługi
  getServiceSlots: (companyId: number, serviceId: number, date: string, workerId?: string) => {
    const params = new URLSearchParams({ date });
    if (workerId) params.append('workerId', workerId);
    return api<ServiceSlotsResponse>(`/services/companies/${companyId}/services/${serviceId}/slots?${params}`);
  },
};
