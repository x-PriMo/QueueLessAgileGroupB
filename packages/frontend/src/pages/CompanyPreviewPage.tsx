import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_URL } from '../lib/api';
import ServiceSelector from '../components/ServiceSelector';

interface Company {
  id: number;
  name: string;
  timezone: string;
  logoPath?: string;
  category?: string;
  description?: string;
}

interface Service {
  id: number;
  name: string;
  durationMinutes: number;
  price: number;
  description?: string;
}

export default function CompanyPreviewPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string; workerId: number } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const idNum = Number(companyId);

  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);
    Promise.all([
      api<{ company: Company }>(`/companies/${companyId}`).then((x) => setCompany(x.company)),
      api<{ services: Service[] }>(`/services/companies/${idNum}/services`).then((x) => setServices(x.services || [])),
    ]).then(() => setIsLoading(false));
  }, [companyId]);

  const dayOfWeekForDate = (d: string): number | null => {
    if (!d) return null;
    const dateObj = new Date(d);
    // JS: 0=Sunday... we keep this mapping as backend uses 0=Sunday
    return dateObj.getDay();
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="brand-spinner mx-auto"></div>
            <p className="text-center text-gray-500 mt-4">Ładowanie danych firmy...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <p className="text-gray-600">Nie znaleziono firmy.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-4">
            <div className="company-logo-container">
              {company.logoPath ? (
                <img src={`${API_URL}${company.logoPath}`} alt={`Logo ${company.name}`} className="h-full w-full object-contain rounded-lg" />
              ) : (
                <div className="company-logo-fallback">
                  <span className="text-white font-bold text-xl">{company.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              {company.category && (
                <p className="text-sm text-blue-700 font-medium">{company.category}</p>
              )}
              <p className="text-sm text-gray-600 mt-2">{company.description}</p>
            </div>
          </div>

          {/* Service selection */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Zarezerwuj wizytę</h2>
            
            {services.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Ta firma nie ma jeszcze żadnych usług</p>
              </div>
            ) : (
              <>
                {/* Wybór daty */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Wybierz datę</label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="input-brand w-full max-w-xs"
                  />
                </div>
                
                {selectedDate && (
                  <ServiceSelector
                    companyId={idNum}
                    selectedService={selectedService}
                    onServiceSelect={setSelectedService}
                    selectedDate={selectedDate}
                    selectedWorker={"any"}
                    onSlotSelect={setSelectedSlot}
                    selectedSlot={selectedSlot}
                  />
                )}
              </>
            )}
            
            {selectedSlot && selectedService && (
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => navigate('/reserve', { 
                    state: { 
                      companyId: idNum,
                      serviceId: selectedService.id,
                      date: selectedDate,
                      time: selectedSlot.startTime,
                      workerId: selectedSlot.workerId
                    }
                  })}
                  className="btn-brand"
                >
                  Potwierdź rezerwację
                </button>
                <button
                  onClick={() => {
                    setSelectedService(null);
                    setSelectedDate('');
                    setSelectedSlot(null);
                  }}
                  className="btn-brand-outline"
                >
                  Wyczyść wybór
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
