import React, { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { api } from '../lib/api';

interface Worker {
  id: number;
  email: string;
  role: string;
}

interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  workerId: number;
}

interface OwnerScheduleManagerProps {
  companyId: number;
}

export default function OwnerScheduleManager({ companyId }: OwnerScheduleManagerProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(DateTime.now().toFormat('yyyy-MM-dd'));
  const [showAddShift, setShowAddShift] = useState(false);
  const [newShift, setNewShift] = useState({
    workerId: '',
    date: DateTime.now().toFormat('yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    breakStart: '',
    breakEnd: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Only load data when companyId is valid (not undefined or 0)
    if (companyId && companyId > 0) {
      loadData();
    }
  }, [companyId]);

  const loadData = async () => {
    if (!companyId || companyId === undefined) {
      console.warn('OwnerScheduleManager: companyId is undefined, skipping data load');
      return;
    }

    try {
      setLoading(true);
      const [workersRes, shiftsRes] = await Promise.all([
        api<{ workers: Worker[] }>(`/companies/${companyId}/workers`),
        api<{ shifts: Shift[] }>(`/shifts/company/${companyId}`)
      ]);
      setWorkers(workersRes.workers);
      setShifts(shiftsRes.shifts);
    } catch (error) {
      console.error('Błąd podczas ładowania danych:', error);
      setMessage('Błąd podczas ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  const handleAddShift = async () => {
    if (!newShift.workerId || !newShift.date || !newShift.startTime || !newShift.endTime) {
      alert('Wypełnij wszystkie wymagane pola');
      return;
    }

    try {
      setLoading(true);
      await api(`/shifts`, {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          workerId: Number(newShift.workerId),
          date: newShift.date,
          startTime: newShift.startTime,
          endTime: newShift.endTime,
          breakStart: newShift.breakStart || null,
          breakEnd: newShift.breakEnd || null
        })
      });

      setMessage('Zmiana dodana pomyślnie');
      setShowAddShift(false);
      setNewShift({
        workerId: '',
        date: DateTime.now().toFormat('yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '17:00',
        breakStart: '',
        breakEnd: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Błąd podczas dodawania zmiany:', error);
      alert(`Błąd podczas dodawania zmiany: ${error.message || 'Spróbuj ponownie'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async (shiftId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tę zmianę?')) return;

    try {
      setLoading(true);
      await api(`/shifts/${shiftId}`, { method: 'DELETE' });
      setMessage('Zmiana usunięta pomyślnie');
      loadData();
    } catch (error: any) {
      console.error('Błąd podczas usuwania zmiany:', error);
      alert(`Błąd podczas usuwania zmiany: ${error.message || 'Spróbuj ponownie'}`);
    } finally {
      setLoading(false);
    }
  };

  const getShiftsForDate = (date: string) => {
    return shifts.filter(shift => shift.date === date);
  };

  const getWorkerName = (workerId: number) => {
    const worker = workers.find(w => w.id === workerId);
    return worker ? worker.email : 'Nieznany pracownik';
  };

  const generateCalendarDays = () => {
    const today = DateTime.now();
    const days = [];

    for (let i = -7; i <= 21; i++) {
      const date = today.plus({ days: i });
      days.push({
        date: date.toFormat('yyyy-MM-dd'),
        dayName: date.toFormat('ccc'),
        dayNumber: date.day,
        isToday: date.hasSame(today, 'day'),
        isPast: date < today.startOf('day')
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="brand-spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Ładowanie grafiku...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Grafik pracowników</h2>
        <button
          onClick={() => setShowAddShift(true)}
          className="btn-brand"
        >
          Dodaj zmianę
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg">
          {message}
        </div>
      )}

      {/* Kalendarz */}
      <div className="mb-6">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 max-h-96 overflow-y-auto">
          {calendarDays.map(day => {
            const dayShifts = getShiftsForDate(day.date);
            return (
              <div
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`p-2 border rounded cursor-pointer transition-colors ${selectedDate === day.date ? 'border-blue-500 bg-blue-50' :
                  day.isToday ? 'border-blue-300 bg-blue-25' :
                    day.isPast ? 'border-gray-200 bg-gray-50' :
                      'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className={`text-sm ${day.isToday ? 'font-bold text-blue-600' : 'text-gray-900'}`}>
                  {day.dayNumber}
                </div>
                <div className="text-xs text-gray-500">{day.dayName}</div>
                {dayShifts.length > 0 && (
                  <div className="mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full mx-auto"></div>
                    <div className="text-xs text-gray-600 text-center">{dayShifts.length}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Szczegóły wybranego dnia */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-3">
          Zmiany na {DateTime.fromFormat(selectedDate, 'yyyy-MM-dd').toFormat('d MMMM yyyy')}
        </h3>

        {getShiftsForDate(selectedDate).length === 0 ? (
          <p className="text-gray-500">Brak zaplanowanych zmian w tym dniu</p>
        ) : (
          <div className="space-y-3">
            {getShiftsForDate(selectedDate).map(shift => (
              <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{getWorkerName(shift.workerId)}</div>
                  <div className="text-sm text-gray-600">
                    {shift.startTime} - {shift.endTime}
                    {shift.breakStart && shift.breakEnd && (
                      <span className="ml-2 text-orange-600">
                        (przerwa: {shift.breakStart}-{shift.breakEnd})
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteShift(shift.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Usuń
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formularz dodawania zmiany */}
      {showAddShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Dodaj zmianę</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pracownik</label>
                <select
                  value={newShift.workerId}
                  onChange={(e) => setNewShift(prev => ({ ...prev, workerId: e.target.value }))}
                  className="input-brand w-full"
                >
                  <option value="">Wybierz pracownika</option>
                  {workers.map(worker => (
                    <option key={worker.id} value={worker.id}>{worker.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={newShift.date}
                  onChange={(e) => setNewShift(prev => ({ ...prev, date: e.target.value }))}
                  className="input-brand w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Godzina rozpoczęcia</label>
                  <input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift(prev => ({ ...prev, startTime: e.target.value }))}
                    className="input-brand w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Godzina zakończenia</label>
                  <input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift(prev => ({ ...prev, endTime: e.target.value }))}
                    className="input-brand w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Początek przerwy (opcjonalnie)</label>
                  <input
                    type="time"
                    value={newShift.breakStart}
                    onChange={(e) => setNewShift(prev => ({ ...prev, breakStart: e.target.value }))}
                    className="input-brand w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Koniec przerwy (opcjonalnie)</label>
                  <input
                    type="time"
                    value={newShift.breakEnd}
                    onChange={(e) => setNewShift(prev => ({ ...prev, breakEnd: e.target.value }))}
                    className="input-brand w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddShift(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Anuluj
              </button>
              <button
                onClick={handleAddShift}
                disabled={loading}
                className="btn-brand disabled:opacity-50"
              >
                {loading ? 'Dodawanie...' : 'Dodaj zmianę'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}