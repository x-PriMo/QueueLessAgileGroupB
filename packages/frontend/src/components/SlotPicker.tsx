import React, { useState, useEffect } from 'react';
import { servicesAPI, ServiceSlot } from '../lib/api';

interface SlotPickerProps {
    companyId: number;
    serviceId: number;
    selectedDate: string;
    onDateChange: (date: string) => void;
    onSlotSelect: (slot: { startTime: string; endTime: string; workerId: number }) => void;
    selectedSlot: { startTime: string; endTime: string; workerId: number } | null;
}

export default function SlotPicker({
    companyId,
    serviceId,
    selectedDate,
    onDateChange,
    onSlotSelect,
    selectedSlot
}: SlotPickerProps) {
    const [slots, setSlots] = useState<ServiceSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedDate && serviceId) {
            loadSlots();
        } else {
            setSlots([]);
        }
    }, [selectedDate, serviceId]);

    const loadSlots = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await servicesAPI.getServiceSlots(companyId, serviceId, selectedDate);
            setSlots(data.slots);
        } catch (err) {
            console.error('Błąd ładowania slotów:', err);
            setError('Nie udało się załadować wolnych terminów. Spróbuj ponownie.');
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

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6">
            {/* Date Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wybierz datę wizyty
                </label>
                <input
                    type="date"
                    className="input-brand w-full md:w-auto"
                    value={selectedDate}
                    min={today}
                    onChange={(e) => onDateChange(e.target.value)}
                />
            </div>

            {/* Slots Grid */}
            {selectedDate && (
                <div className="animate-fade-in">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Dostępne godziny
                    </h3>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="brand-spinner"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {slots.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {groupSlotsByTime(slots).map(({ time, slots: timeSlots, availableCount }) => {
                                        const hasAvailable = availableCount > 0;
                                        const isSelected = selectedSlot?.startTime === time;

                                        if (!hasAvailable) return null; // Hide unavailable slots to reduce clutter

                                        return (
                                            <button
                                                key={time}
                                                onClick={() => {
                                                    // Auto-select first available worker for this slot
                                                    // In future we could allow specific worker selection here
                                                    const firstAvailable = timeSlots.find(s => s.isAvailable);
                                                    if (firstAvailable && firstAvailable.availableWorkers.length > 0) {
                                                        onSlotSelect({
                                                            startTime: firstAvailable.startTime,
                                                            endTime: firstAvailable.endTime,
                                                            workerId: firstAvailable.availableWorkers[0].id
                                                        });
                                                    }
                                                }}
                                                className={`
                          relative px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                          ${isSelected
                                                        ? 'bg-blue-600 text-white shadow-md transform scale-105 ring-2 ring-blue-300'
                                                        : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                                                    }
                        `}
                                            >
                                                {time}
                                                {isSelected && (
                                                    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-gray-500">Brak wolnych terminów w tym dniu.</p>
                                    <p className="text-sm text-gray-400 mt-1">Spróbuj wybrać inną datę.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
