import React, { useState, useEffect } from 'react';
import { DateTime } from 'luxon';

interface WorkerSchedule {
  id: number;
  name: string;
  role: string;
  shifts: Array<{
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    breaks: Array<{
      startTime: string;
      endTime: string;
    }>;
  }>;
}

interface WorkerScheduleCalendarProps {
  companyId: number;
  workers: WorkerSchedule[];
  onDateClick: (date: string) => void;
  selectedDate: string | null;
}

export default function WorkerScheduleCalendar({ 
  companyId, 
  workers, 
  onDateClick, 
  selectedDate 
}: WorkerScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(DateTime.now());
  
  const getDaysInMonth = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const days = [];
    
    let day = startOfMonth;
    while (day <= endOfMonth) {
      days.push(day);
      day = day.plus({ days: 1 });
    }
    
    return days;
  };

  const getWeekDays = () => {
    const startOfWeek = DateTime.now().startOf('week');
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      days.push(startOfWeek.plus({ days: i }));
    }
    
    return days;
  };

  const getWorkersForDate = (date: DateTime) => {
    const dateStr = date.toFormat('yyyy-MM-dd');
    return workers.filter(worker => 
      worker.shifts.some(shift => shift.date === dateStr)
    );
  };

  const getShiftsForWorkerAndDate = (workerId: number, date: string) => {
    const worker = workers.find(w => w.id === workerId);
    return worker?.shifts.filter(shift => shift.date === date) || [];
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(currentMonth.minus({ months: 1 }));
  };

  const goToNextMonth = () => {
    setCurrentMonth(currentMonth.plus({ months: 1 }));
  };

  const goToToday = () => {
    setCurrentMonth(DateTime.now());
  };

  const days = getDaysInMonth();
  const weekDays = getWeekDays();

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Grafik pracowników</h2>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            ← Poprzedni
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Dzisiaj
          </button>
          <button
            onClick={goToNextMonth}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Następny →
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-medium text-center text-gray-900">
          {currentMonth.toFormat('MMMM yyyy')}
        </h3>
      </div>

      {/* Kalendarz miesięczny */}
      <div className="grid grid-cols-7 gap-1 mb-8">
        {weekDays.map(day => (
          <div key={day.weekday} className="p-2 text-center text-sm font-medium text-gray-700">
            {day.toFormat('EEE')}
          </div>
        ))}
        
        {days.map(day => {
          const workersForDay = getWorkersForDate(day);
          const isToday = day.hasSame(DateTime.now(), 'day');
          const isSelected = selectedDate === day.toFormat('yyyy-MM-dd');
          const hasWorkers = workersForDay.length > 0;
          
          return (
            <div
              key={day.toISODate()}
              onClick={() => onDateClick(day.toFormat('yyyy-MM-dd'))}
              className={`p-2 min-h-[80px] border rounded cursor-pointer transition-colors ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : isToday 
                  ? 'border-blue-300 bg-blue-25' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`text-sm font-medium ${
                isToday ? 'text-blue-600' : 'text-gray-900'
              }`}>
                {day.day}
              </div>
              
              {hasWorkers && (
                <div className="mt-1">
                  <div className="text-xs text-green-600">
                    {workersForDay.length} prac.
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {workersForDay.slice(0, 2).map(worker => (
                      <div
                        key={worker.id}
                        className="w-2 h-2 bg-green-400 rounded-full"
                        title={worker.name}
                      />
                    ))}
                    {workersForDay.length > 2 && (
                      <div className="text-xs text-gray-500">+{workersForDay.length - 2}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Szczegóły dla wybranego dnia */}
      {selectedDate && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Szczegóły dla dnia: {DateTime.fromISO(selectedDate).toFormat('dd MMMM yyyy')}
          </h3>
          
          <div className="space-y-4">
            {workers.map(worker => {
              const shifts = getShiftsForWorkerAndDate(worker.id, selectedDate);
              
              if (shifts.length === 0) return null;
              
              return (
                <div key={worker.id} className="border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{worker.name}</h4>
                      <p className="text-sm text-gray-600">{worker.role}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      worker.role === 'OWNER' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {worker.role === 'OWNER' ? 'Właściciel' : 'Pracownik'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {shifts.map(shift => (
                      <div key={shift.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium text-gray-900">
                            {shift.startTime} - {shift.endTime}
                          </span>
                          {shift.breaks.length > 0 && (
                            <div className="text-xs text-gray-600">
                              Przerwy: {shift.breaks.map(b => `${b.startTime}-${b.endTime}`).join(', ')}
                            </div>
                          )}
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Pracuje
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {workers.every(worker => getShiftsForWorkerAndDate(worker.id, selectedDate).length === 0) && (
              <div className="text-center py-8">
                <p className="text-gray-500">Brak pracowników w tym dniu</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}