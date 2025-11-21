import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Worker {
  id: number;
  email: string;
  role: string;
  canServe: boolean;
  isTrainee: boolean;
}

export default function OwnerWorkersManager() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [addingWorker, setAddingWorker] = useState(false);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const companiesRes = await api<{ companies: Array<{id: number}> }>('/companies/owner/companies');
      if (companiesRes.companies.length > 0) {
        const companyId = companiesRes.companies[0].id;
        const response = await api<{ workers: Worker[] }>(`/companies/${companyId}/workers`);
        setWorkers(response.workers || []);
      }
    } catch (err) {
      setError('Błąd podczas ładowania pracowników');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addWorker = async () => {
    if (!newWorkerEmail) return;
    
    // Walidacja formatu email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newWorkerEmail)) {
      alert('Proszę podać prawidłowy adres email');
      return;
    }
    
    try {
      setAddingWorker(true);
      const companiesRes = await api<{ companies: Array<{id: number}> }>('/companies/owner/companies');
      if (companiesRes.companies.length === 0) return;
      
      const companyId = companiesRes.companies[0].id;
      
      await api(`/companies/${companyId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: newWorkerEmail, role: 'WORKER' }),
      });
      
      setNewWorkerEmail('');
      setMessage('Pracownik dodany pomyślnie');
      loadWorkers();
    } catch (error: any) {
      console.error('Błąd podczas dodawania pracownika:', error);
      
      // Lepsze komunikaty błędów
      if (error.message?.includes('User not found') || error.message?.includes('Nie znaleziono')) {
        setError(`Nie znaleziono użytkownika o emailu: ${newWorkerEmail}. Upewnij się, że osoba najpierw zarejestrowała się w systemie.`);
      } else if (error.message?.includes('already exists') || error.message?.includes('już istnieje')) {
        setError(`Użytkownik ${newWorkerEmail} jest już członkiem tej firmy`);
      } else {
        setError(`Błąd podczas dodawania pracownika: ${error.message || 'Spróbuj ponownie później'}`);
      }
    } finally {
      setAddingWorker(false);
    }
  };

  const updateWorkerStatus = async (workerId: number, updates: Partial<Worker>) => {
    try {
      const companiesRes = await api<{ companies: Array<{id: number}> }>('/companies/owner/companies');
      if (companiesRes.companies.length === 0) return;
      
      const companyId = companiesRes.companies[0].id;
      
      await api(`/companies/${companyId}/workers/${workerId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      setMessage('Ustawienia pracownika zaktualizowane');
      loadWorkers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wystąpił błąd';
      setError(msg);
    }
  };

  const removeWorker = async (workerId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tego pracownika z firmy?')) return;
    
    try {
      const companiesRes = await api<{ companies: Array<{id: number}> }>('/companies/owner/companies');
      if (companiesRes.companies.length === 0) return;
      
      const companyId = companiesRes.companies[0].id;
      
      await api(`/companies/${companyId}/members/${workerId}`, {
        method: 'DELETE'
      });
      
      setMessage('Pracownik usunięty z firmy');
      loadWorkers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wystąpił błąd';
      setError(msg);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="brand-spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Ładowanie pracowników...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dodawanie pracownika */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Dodaj pracownika</h2>
        <div className="flex space-x-4">
          <input
            type="email"
            value={newWorkerEmail}
            onChange={(e) => setNewWorkerEmail(e.target.value)}
            placeholder="Email pracownika"
            className="input-brand flex-1"
          />
          <button
            onClick={addWorker}
            disabled={addingWorker || !newWorkerEmail}
            className="btn-brand disabled:opacity-50"
          >
            {addingWorker ? 'Dodawanie...' : 'Dodaj pracownika'}
          </button>
        </div>
        {(message || error) && (
          <div className={`mt-4 p-4 rounded-lg ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {error || message}
          </div>
        )}
      </div>

      {/* Lista pracowników */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Twoi pracownicy</h2>
        
        {workers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nie masz jeszcze żadnych pracowników</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workers.map(worker => (
              <div key={worker.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium">{worker.email}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        worker.role === 'OWNER' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {worker.role === 'OWNER' ? 'Właściciel' : 'Pracownik'}
                      </span>
                      {worker.isTrainee && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Stażysta
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={worker.canServe}
                          onChange={(e) => updateWorkerStatus(worker.id, { canServe: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Może obsługiwać klientów</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={worker.isTrainee}
                          onChange={(e) => updateWorkerStatus(worker.id, { isTrainee: e.target.checked })}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">Stażysta (dłuższy czas usług)</span>
                      </label>
                    </div>
                  </div>
                  {worker.role !== 'OWNER' && (
                    <button
                      onClick={() => removeWorker(worker.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Usuń z firmy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}