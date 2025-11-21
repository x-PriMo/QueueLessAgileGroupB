import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface QueueItem {
  id: number;
  customerEmail: string;
  startTime: string;
  estimatedEndTime: string;
  status: 'WAITING' | 'IN_SERVICE' | 'DONE';
  isTrainee?: boolean;
}

interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

interface Company {
  id: number;
  name: string;
  slotMinutes: number;
  traineeExtraMinutes: number;
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [todayShift, setTodayShift] = useState<Shift | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    let mounted = true;
    // initial load
    loadWorkerData();
    // refresh data every 5 seconds per project real-time policy
    const dataTimer = setInterval(() => {
      if (mounted) loadWorkerData();
    }, 5000);
    // refresh clock every 5 seconds to keep UI fresh
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => {
      mounted = false;
      clearInterval(dataTimer);
      clearInterval(clockTimer);
    };
  }, []);

  const loadWorkerData = async () => {
    try {
      // Endpoint do pobrania danych pracownika - może wymagać implementacji
      const [queueResponse, shiftResponse, companyResponse] = await Promise.all([
        api<{ queue: QueueItem[] }>('/worker/queue'),
        api<{ shift: Shift | null }>('/worker/shift/today'),
        api<{ company: Company }>('/worker/company'),
      ]);

      setQueue(queueResponse.queue);
      setTodayShift(shiftResponse.shift);
      setCompany(companyResponse.company);
    } catch (error) {
      console.error('Błąd podczas ładowania danych pracownika:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQueueItemStatus = async (itemId: number, status: 'WAITING' | 'IN_SERVICE' | 'DONE') => {
    try {
      await api(`/queue/${itemId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      
      setQueue(prevQueue => 
        prevQueue.map(item => 
          item.id === itemId ? { ...item, status } : item
        )
      );
    } catch (error) {
      console.error('Błąd podczas aktualizacji statusu:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_SERVICE':
        return 'bg-blue-100 text-blue-800';
      case 'DONE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'WAITING':
        return 'Oczekuje';
      case 'IN_SERVICE':
        return 'W trakcie';
      case 'DONE':
        return 'Zakończone';
      default:
        return status;
    }
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // HH:MM
  };

  const isCurrentlyWorking = () => {
    if (!todayShift) return false;
    
    const now = currentTime.toTimeString().slice(0, 5);
    const isInWorkHours = now >= todayShift.startTime && now <= todayShift.endTime;
    
    if (todayShift.breakStart && todayShift.breakEnd) {
      const isInBreak = now >= todayShift.breakStart && now <= todayShift.breakEnd;
      return isInWorkHours && !isInBreak;
    }
    
    return isInWorkHours;
  };

  const getNextAction = () => {
    const waitingItems = queue.filter(item => item.status === 'WAITING');
    const inServiceItems = queue.filter(item => item.status === 'IN_SERVICE');
    
    if (inServiceItems.length > 0) {
      return `Zakończ obsługę klienta (${inServiceItems[0].customerEmail.replace(/(.{3}).*(@.*)/, '$1***$2')})`;
    }
    
    if (waitingItems.length > 0) {
      return `Rozpocznij obsługę następnego klienta`;
    }
    
    return 'Brak klientów w kolejce';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-gray-200 pb-5">
            <h1 className="text-3xl font-bold leading-6 text-gray-900">
              Panel pracownika
            </h1>
            <p className="mt-2 max-w-4xl text-sm text-gray-500">
              Witaj, {user?.email}! {company && `Pracujesz w: ${company.name}`}
            </p>
          </div>
        </div>

        {/* Current Status */}
        <div className="px-4 sm:px-0 mb-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Status pracy</h2>
                <div className="mt-2 flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-2 ${isCurrentlyWorking() ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-sm text-gray-600">
                    {isCurrentlyWorking() ? 'Aktywny' : 'Nieaktywny'}
                  </span>
                </div>
                {todayShift && (
                  <p className="text-sm text-gray-500 mt-1">
                    Zmiana: {formatTime(todayShift.startTime)} - {formatTime(todayShift.endTime)}
                    {todayShift.breakStart && todayShift.breakEnd && (
                      <span> (przerwa: {formatTime(todayShift.breakStart)} - {formatTime(todayShift.breakEnd)})</span>
                    )}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Aktualna godzina</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentTime.toTimeString().slice(0, 5)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Action */}
        <div className="px-4 sm:px-0 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Następna akcja
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>{getNextAction()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Queue */}
        <div className="px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Kolejka dnia ({queue.length} klientów)
              </h3>
              
              {queue.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Brak klientów</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Nie ma obecnie żadnych klientów w kolejce.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {queue.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {index + 1}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {item.customerEmail.replace(/(.{3}).*(@.*)/, '$1***$2')}
                              {item.isTrainee && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                  Stażysta
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">
                              Planowany czas: {formatTime(item.startTime)} - {formatTime(item.estimatedEndTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                          <div className="flex space-x-2">
                            {item.status === 'WAITING' && (
                              <button
                                onClick={() => updateQueueItemStatus(item.id, 'IN_SERVICE')}
                                className="btn-brand-secondary text-sm"
                              >
                                Rozpocznij
                              </button>
                            )}
                            {item.status === 'IN_SERVICE' && (
                              <button
                                onClick={() => updateQueueItemStatus(item.id, 'DONE')}
                                className="btn-brand text-sm"
                              >
                                Zakończ
                              </button>
                            )}
                            {item.status === 'DONE' && (
                              <span className="text-sm text-green-600 font-medium">
                                ✓ Zakończone
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-4 sm:px-0 mt-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                      <dt className="text-sm font-medium text-gray-500 truncate">Oczekujący</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {queue.filter(item => item.status === 'WAITING').length}
                      </dd>
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
                      <dd className="text-lg font-medium text-gray-900">
                        {queue.filter(item => item.status === 'IN_SERVICE').length}
                      </dd>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Zakończone</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {queue.filter(item => item.status === 'DONE').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
