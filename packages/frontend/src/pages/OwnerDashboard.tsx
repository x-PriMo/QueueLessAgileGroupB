import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface Company {
  id: number;
  name: string;
  category?: string;
  timezone: string;
  slotMinutes: number;
  autoAccept: boolean;
}

interface Reservation {
  id: number;
  customerEmail: string;
  date: string;
  startTime: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  workerName?: string;
}

interface QueueStats {
  pending: number;
  accepted: number;
  inService: number;
  completed: number;
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workers, setWorkers] = useState<Array<{ id: number; email: string }>>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [addingWorker, setAddingWorker] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      loadReservations(selectedCompany.id);
      loadQueueStats(selectedCompany.id);
      loadWorkers(selectedCompany.id);
    }
  }, [selectedCompany]);

  const loadCompanies = async () => {
    try {
      // Endpoint do pobrania firm właściciela - może wymagać implementacji
      const response = await api<{ companies: Company[] }>('/companies/owner/companies');
      setCompanies(response.companies);
      if (response.companies.length > 0) {
        setSelectedCompany(response.companies[0]);
      }
    } catch (error) {
      console.error('Błąd podczas ładowania firm:', error);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReservations = async (companyId: number) => {
    try {
      const response = await api<{ reservations: Reservation[] }>(`/reservations/company/${companyId}`);
      setReservations(response.reservations);
    } catch (error) {
      console.error('Błąd podczas ładowania rezerwacji:', error);
      setReservations([]);
    }
  };

  const loadQueueStats = async (companyId: number) => {
    try {
      const response = await api<{ queue: QueueStats }>(`/queue/${companyId}`);
      setQueueStats(response.queue);
    } catch (error) {
      console.error('Błąd podczas ładowania statystyk kolejki:', error);
      setQueueStats(null);
    }
  };

  const loadWorkers = async (companyId: number) => {
    try {
      setIsLoadingWorkers(true);
      const response = await api<{ workers: Array<{ id: number; email: string }> }>(`/companies/${companyId}/workers`);
      setWorkers(response.workers);
    } catch (error) {
      console.error('Błąd podczas ładowania pracowników:', error);
      setWorkers([]);
    } finally {
      setIsLoadingWorkers(false);
    }
  };

  const addWorker = async () => {
    if (!selectedCompany || !newWorkerEmail) return;
    
    // Walidacja formatu email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newWorkerEmail)) {
      alert('Proszę podać prawidłowy adres email');
      return;
    }
    
    try {
      setAddingWorker(true);
      await api(`/companies/${selectedCompany.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: newWorkerEmail, role: 'WORKER' }),
      });
      setNewWorkerEmail('');
      loadWorkers(selectedCompany.id);
      alert('Pracownik został pomyślnie dodany do firmy');
    } catch (error: any) {
      console.error('Błąd podczas dodawania pracownika:', error);
      
      // Lepsze komunikaty błędów
      if (error.message?.includes('User not found') || error.message?.includes('Nie znaleziono')) {
        alert(`Nie znaleziono użytkownika o emailu: ${newWorkerEmail}\n\nUpewnij się, że osoba najpierw zarejestrowała się w systemie.`);
      } else if (error.message?.includes('already exists') || error.message?.includes('już istnieje')) {
        alert(`Użytkownik ${newWorkerEmail} jest już członkiem tej firmy`);
      } else {
        alert(`Błąd podczas dodawania pracownika: ${error.message || 'Spróbuj ponownie później'}`);
      }
    } finally {
      setAddingWorker(false);
    }
  };

  const navigateToSettings = () => {
    if (selectedCompany) {
      navigate(`/company/${selectedCompany.id}/settings`);
    }
  };

  const updateReservationStatus = async (reservationId: number, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      await api(`/reservations/${reservationId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      if (selectedCompany) {
        loadReservations(selectedCompany.id);
        loadQueueStats(selectedCompany.id);
      }
    } catch (error) {
      console.error('Błąd podczas aktualizacji statusu rezerwacji:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'DECLINED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'Zaakceptowana';
      case 'PENDING':
        return 'Oczekuje';
      case 'DECLINED':
        return 'Odrzucona';
      case 'CANCELLED':
        return 'Anulowana';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="brand-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Brak firm</h3>
          <p className="mt-1 text-sm text-gray-500">
            Nie jesteś właścicielem żadnej firmy lub endpoint wymaga implementacji.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-gray-200 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold leading-6 text-gray-900">
                  Panel właściciela
                </h1>
                <p className="mt-2 max-w-4xl text-sm text-gray-500">
                  Witaj, {user?.email}! Zarządzaj swoimi firmami i rezerwacjami.
                </p>
              </div>
              {companies.length > 1 && (
                <div className="min-w-0 flex-1 max-w-xs">
                  <label htmlFor="company-select" className="sr-only">
                    Wybierz firmę
                  </label>
                  <select
                    id="company-select"
                    value={selectedCompany?.id || ''}
                    onChange={(e) => {
                      const company = companies.find(c => c.id === Number(e.target.value));
                      setSelectedCompany(company || null);
                    }}
                    className="input-brand"
                  >
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedCompany && (
          <>
            {/* Company Info */}
            <div className="px-4 sm:px-0 mb-8">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedCompany.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedCompany.category} • Strefa czasowa: {selectedCompany.timezone}
                    </p>
                    <p className="text-sm text-gray-500">
                      Slot: {selectedCompany.slotMinutes} min • 
                      Automatyczna akceptacja: {selectedCompany.autoAccept ? 'Włączona' : 'Wyłączona'}
                    </p>
                  </div>
                  <button 
                    onClick={navigateToSettings}
                    className="btn-brand-secondary"
                  >
                    Ustawienia firmy
                  </button>
                </div>
              </div>
            </div>

            {/* Workers Management */}
            <div className="px-4 sm:px-0 mb-8">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Pracownicy
                  </h3>

                  <div className="mb-6 flex items-end space-x-3">
                    <div className="flex-1">
                      <label htmlFor="new-worker-email" className="block text-sm font-medium text-gray-700">
                        E‑mail pracownika
                      </label>
                      <input
                        id="new-worker-email"
                        type="email"
                        value={newWorkerEmail}
                        onChange={(e) => setNewWorkerEmail(e.target.value)}
                        placeholder="pracownik@firma.pl"
                        className="input-brand w-full"
                      />
                    </div>
                    <button
                      onClick={addWorker}
                      disabled={addingWorker || !newWorkerEmail}
                      className="btn-brand"
                    >
                      {addingWorker ? 'Dodaję…' : 'Dodaj pracownika'}
                    </button>
                  </div>

                  {isLoadingWorkers ? (
                    <div className="text-center py-6">
                      <div className="brand-spinner mx-auto mb-4"></div>
                      <p className="text-gray-500">Ładowanie pracowników…</p>
                    </div>
                  ) : workers.length === 0 ? (
                    <p className="text-gray-500">Brak pracowników w tej firmie.</p>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {workers.map((w) => (
                        <li key={w.id} className="py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{w.email}</p>
                            <p className="text-xs text-gray-500">Rola: WORKER</p>
                          </div>
                          {/* Przycisk usuwania/przełączania dostępności można dodać później */}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Queue Stats */}
            {queueStats && (
              <div className="px-4 sm:px-0 mb-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Oczekujące</dt>
                            <dd className="text-lg font-medium text-gray-900">{queueStats.pending}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Zaakceptowane</dt>
                            <dd className="text-lg font-medium text-gray-900">{queueStats.accepted}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">W trakcie</dt>
                            <dd className="text-lg font-medium text-gray-900">{queueStats.inService}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Zakończone</dt>
                            <dd className="text-lg font-medium text-gray-900">{queueStats.completed}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reservations */}
            <div className="px-4 sm:px-0">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Rezerwacje
                  </h3>
                  
                  {reservations.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V7a2 2 0 012-2h4a2 2 0 012 2v0M8 7v8a2 2 0 002 2h4a2 2 0 002-2V7M8 7H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Brak rezerwacji</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Nie ma jeszcze żadnych rezerwacji dla tej firmy.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Klient
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Data i godzina
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pracownik
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="relative px-6 py-3">
                              <span className="sr-only">Akcje</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reservations.map((reservation) => (
                            <tr key={reservation.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {reservation.customerEmail.replace(/(.{3}).*(@.*)/, '$1***$2')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {reservation.date} o {reservation.startTime}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {reservation.workerName || 'Dowolny'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                                  {getStatusText(reservation.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {reservation.status === 'PENDING' && (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => updateReservationStatus(reservation.id, 'ACCEPTED')}
                                      className="text-green-600 hover:text-green-900"
                                    >
                                      Akceptuj
                                    </button>
                                    <button
                                      onClick={() => updateReservationStatus(reservation.id, 'DECLINED')}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Odrzuć
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
