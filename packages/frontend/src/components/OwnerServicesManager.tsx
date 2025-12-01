import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Service {
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

interface Worker {
  id: number;
  email: string;
  role: string;
}

export default function OwnerServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    durationMinutes: 30,
    price: 0,
    description: '',
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Pobierz pierwszą firmę właściciela
      const companiesRes = await api<{ companies: Array<{id: number, name: string}> }>('/companies/owner/companies');
      if (companiesRes.companies.length > 0) {
        const companyId = companiesRes.companies[0].id;
        
        const [servicesRes, workersRes] = await Promise.all([
          api<{ services: Service[] }>(`/services/companies/${companyId}/services`),
          api<{ workers: Worker[] }>(`/companies/${companyId}/workers`)
        ]);
        
        setServices(servicesRes.services || []);
        setWorkers(workersRes.workers || []);
      }
    } catch (err) {
      setError('Błąd podczas ładowania danych');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               name === 'durationMinutes' || name === 'price' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const companiesRes = await api<{ companies: Array<{id: number}> }>('/companies/owner/companies');
      if (companiesRes.companies.length === 0) return;
      
      const companyId = companiesRes.companies[0].id;
      
      if (editingService) {
        // Aktualizacja usługi
        await api(`/services/companies/${companyId}/services/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setMessage('Usługa zaktualizowana pomyślnie');
      } else {
        // Dodawanie nowej usługi
        await api(`/services/companies/${companyId}/services`, {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setMessage('Usługa dodana pomyślnie');
      }
      
      setShowForm(false);
      setEditingService(null);
      setFormData({
        name: '',
        durationMinutes: 30,
        price: 0,
        description: '',
        isActive: true
      });
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wystąpił błąd';
      setError(msg);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
      description: service.description || '',
      isActive: service.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (serviceId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tę usługę?')) return;
    
    try {
      const companiesRes = await api<{ companies: Array<{id: number}> }>('/companies/owner/companies');
      if (companiesRes.companies.length === 0) return;
      
      const companyId = companiesRes.companies[0].id;
      
      await api(`/services/companies/${companyId}/services/${serviceId}`, {
        method: 'DELETE'
      });
      
      setMessage('Usługa usunięta pomyślnie');
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wystąpił błąd podczas usuwania';
      setError(msg);
    }
  };

  const handleToggleStatus = async (service: Service) => {
    try {
      const companiesRes = await api<{ companies: Array<{id: number}> }>('/companies/owner/companies');
      if (companiesRes.companies.length === 0) return;
      
      const companyId = companiesRes.companies[0].id;
      
      await api(`/services/companies/${companyId}/services/${service.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...service, isActive: !service.isActive }),
      });
      
      setMessage(`Usługa ${!service.isActive ? 'aktywowana' : 'dezaktywowana'}`);
      loadData();
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
          <p className="text-gray-500">Ładowanie usług...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Zarządzanie usługami</h2>
          <button
            onClick={() => {
              setEditingService(null);
              setFormData({
                name: '',
                durationMinutes: 30,
                price: 0,
                description: '',
                isActive: true
              });
              setShowForm(true);
            }}
            className="btn-brand"
          >
            Dodaj usługę
          </button>
        </div>

        {/* Komunikaty */}
        {(message || error) && (
          <div className={`mb-4 p-4 rounded-lg ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {error || message}
          </div>
        )}

        {/* Lista usług */}
        <div className="space-y-4">
          {services.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nie masz jeszcze żadnych usług</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Dodaj pierwszą usługę
              </button>
            </div>
          ) : (
            services.map(service => (
              <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium">{service.name}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        service.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {service.isActive ? 'Aktywna' : 'Nieaktywna'}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{service.description || 'Brak opisu'}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>Czas: {service.durationMinutes} min</span>
                      <span>Cena: {service.price} zł</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(service)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() => handleToggleStatus(service)}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      {service.isActive ? 'Dezaktywuj' : 'Aktywuj'}
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Formularz dodawania/edycji */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingService ? 'Edytuj usługę' : 'Dodaj usługę'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa usługi</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input-brand w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Czas wykonania (minuty)</label>
                <input
                  type="number"
                  name="durationMinutes"
                  value={formData.durationMinutes}
                  onChange={handleInputChange}
                  min="5"
                  max="300"
                  className="input-brand w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cena (zł)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="input-brand w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="input-brand w-full"
                  placeholder="Opisz usługę..."
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Usługa aktywna</span>
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingService(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-brand disabled:opacity-50"
                >
                  {loading ? 'Zapisywanie...' : (editingService ? 'Zaktualizuj' : 'Dodaj')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
