import React, { useState, useEffect } from 'react';
import { servicesAPI, Service, ServiceSlot, ServiceSlotsResponse } from '../lib/api';

interface ServiceSelectorProps {
  companyId: number;
  selectedService: Service | null;
  onServiceSelect: (service: Service) => void;
  selectedDate: string;
  selectedWorker: string;
  onSlotSelect: (slot: { startTime: string; endTime: string; workerId: number }) => void;
  selectedSlot: { startTime: string; endTime: string; workerId: number } | null;
}

export default function ServiceSelector({ 
  companyId, 
  selectedService, 
  onServiceSelect, 
  selectedDate,
  selectedWorker,
  onSlotSelect,
  selectedSlot 
}: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<ServiceSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, [companyId]);

  useEffect(() => {
    console.log('Effect: selectedService, selectedDate, selectedWorker changed', {
      selectedService,
      selectedDate,
      selectedWorker
    });
    if (selectedService && selectedDate) {
      loadSlots();
    } else {
      console.log('Nie ładuje slotów - brak service lub date');
      setSlots([]);
    }
  }, [selectedService, selectedDate, selectedWorker]);

  const loadServices = async () => {
    try {
      console.log('Ładowanie usług dla firmy:', companyId);
      const data = await servicesAPI.getServices(companyId);
      console.log('Załadowane usługi:', data.services);
      setServices(data.services);
    } catch (err) {
      console.error('Błąd ładowania usług:', err);
      setError('Nie udało się załadować usług');
    }
  };

  const loadSlots = async () => {
    if (!selectedService) return;
    
    try {
      setLoading(true);
      console.log('Ładowanie slotów dla:', {
        companyId,
        serviceId: selectedService.id,
        date: selectedDate,
        worker: selectedWorker
      });
      const data = await servicesAPI.getServiceSlots(
        companyId, 
        selectedService.id, 
        selectedDate,
        selectedWorker === 'any' ? undefined : selectedWorker
      );
      console.log('Załadowane sloty:', data.slots);
      setSlots(data.slots);
      setError(null);
    } catch (err) {
      console.error('Błąd ładowania slotów:', err);
      setError('Nie udało się załadować wolnych terminów');
    } finally {
      setLoading(false);
    }
  };

  const groupSlotsByTime = (slots: ServiceSlot[]) => {
    const groups: { [key: string]: ServiceSlot[] } = {};
    
    slots.forEach(slot => {
      const key = slot.startTime;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(slot);
    });
    
    return Object.entries(groups).map(([time, timeSlots]) => ({
      time,
      slots: timeSlots,
      availableCount: timeSlots.filter(s => s.isAvailable).length
    }));
  };

  if (services.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Brak dostępnych usług</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wybór usługi */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Wybierz usługę</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              onClick={() => onServiceSelect(service)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedService?.id === service.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-medium text-gray-900">{service.name}</h4>
              <p className="text-sm text-gray-600 mt-1">
                Czas: {service.durationMinutes} minut • Cena: {service.price.toFixed(2)} zł
              </p>
              {service.description && (
                <p className="text-sm text-gray-500 mt-2">{service.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Wybór terminu */}
      {selectedService && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Wybierz termin dla: {selectedService.name}
          </h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Ładowanie wolnych terminów...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupSlotsByTime(slots).map(({ time, slots: timeSlots, availableCount }) => {
                const hasAvailableSlots = availableCount > 0;
                const isSelected = selectedSlot?.startTime === time;
                
                return (
                  <div key={time} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-900">{time}</h4>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        hasAvailableSlots 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {hasAvailableSlots ? `Dostępne: ${availableCount}` : 'Brak wolnych'}
                      </span>
                    </div>
                    
                    {hasAvailableSlots && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {timeSlots.filter(slot => slot.isAvailable).map((slot, index) => (
                          <button
                            key={`${time}-${index}`}
                            onClick={() => {
                              if (slot.availableWorkers.length > 0) {
                                onSlotSelect({
                                  startTime: slot.startTime,
                                  endTime: slot.endTime,
                                  workerId: slot.availableWorkers[0].id
                                });
                              }
                            }}
                            className={`p-2 text-sm border rounded transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {slot.startTime} - {slot.endTime}
                            {slot.availableWorkers.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {slot.availableWorkers.map(w => w.name).join(', ')}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {slots.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Brak wolnych terminów w wybranym dniu</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}