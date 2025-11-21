import React, { useState, useEffect } from 'react';
import { servicesAPI, Service } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface ServiceFormData {
  name: string;
  durationMinutes: number;
  price: number;
  description: string;
  isActive: boolean;
}

interface ServiceManagerProps {
  companyId: number;
}

export default function ServiceManager({ companyId }: ServiceManagerProps) {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    durationMinutes: 30,
    price: 0,
    description: '',
    isActive: true,
  });

  useEffect(() => {
    loadServices();
  }, [companyId]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await servicesAPI.getServices(companyId);
      setServices(data.services);
      setError(null);
    } catch (err) {
      setError('Nie udało się załadować usług');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingService) {
        await servicesAPI.updateService(companyId, editingService.id, formData);
      } else {
        await servicesAPI.createService(companyId, formData);
      }
      await loadServices();
      resetForm();
    } catch (err) {
      setError('Nie udało się zapisać usługi');
      console.error(err);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
      description: service.description || '',
      isActive: service.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (serviceId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tę usługę?')) return;
    
    try {
      await servicesAPI.deleteService(companyId, serviceId);
      await loadServices();
    } catch (err) {
      setError('Nie udało się usunąć usługi');
      console.error(err);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingService(null);
    setFormData({
      name: '',
      durationMinutes: 30,
      price: 0,
      description: '',
      isActive: true,
    });
  };

  if (loading) return <div className="text-center py-4">Ładowanie...</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Zarządzanie usługami</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Dodaj usługę
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h3 className="text-lg font-medium mb-4">
            {editingService ? 'Edytuj usługę' : 'Nowa usługa'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nazwa usługi
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="durationMinutes" className="block text-sm font-medium text-gray-700">
                  Czas trwania (minuty)
                </label>
                <input
                  type="number"
                  id="durationMinutes"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                  min="1"
                  max="480"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Cena (zł)
                </label>
                <input
                  type="number"
                  id="price"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Opis (opcjonalnie)
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Usługa aktywna
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingService ? 'Zaktualizuj' : 'Dodaj'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Anuluj
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {services.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Brak usług. Dodaj pierwszą usługę!</p>
        ) : (
          services.map((service) => (
            <div key={service.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Czas: {service.durationMinutes} minut • Cena: {service.price.toFixed(2)} zł
                  </p>
                  {service.description && (
                    <p className="text-sm text-gray-600 mt-2">{service.description}</p>
                  )}
                  <div className="flex items-center mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      service.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {service.isActive ? 'Aktywna' : 'Nieaktywna'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(service)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edytuj
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
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
  );
}