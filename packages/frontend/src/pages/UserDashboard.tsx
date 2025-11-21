import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface Reservation {
  id: number;
  companyName: string;
  serviceName?: string;
  date: string;
  startTime: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReservations = async () => {
      try {
        // Endpoint do pobrania rezerwacji użytkownika
        const response = await api<{ reservations: Reservation[] }>('/reservations/my');
        setReservations(response.reservations);
      } catch (error) {
        console.error('Błąd podczas ładowania rezerwacji:', error);
        setReservations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadReservations();
  }, []);

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
      case 'IN_SERVICE':
        return 'bg-blue-100 text-blue-800';
      case 'DONE':
        return 'bg-purple-100 text-purple-800';
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
      case 'IN_SERVICE':
        return 'W trakcie';
      case 'DONE':
        return 'Zakończona';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-gray-200 pb-5">
            <h1 className="text-3xl font-bold leading-6 text-gray-900">
              Panel użytkownika
            </h1>
            <p className="mt-2 max-w-4xl text-sm text-gray-500">
              Witaj, {user?.email}! Zarządzaj swoimi rezerwacjami i odkrywaj nowe usługi.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 sm:px-0 mb-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/reserve"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Nowa rezerwacja
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Zarezerwuj wizytę w wybranej firmie
                </p>
              </div>
            </Link>

            <Link
              to="/"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Przeglądaj firmy
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Odkryj dostępne usługi w Twojej okolicy
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Reservations */}
        <div className="px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Moje rezerwacje
              </h3>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="brand-spinner mx-auto mb-4"></div>
                  <p className="text-gray-500">Ładowanie rezerwacji...</p>
                </div>
              ) : reservations.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V7a2 2 0 012-2h4a2 2 0 012 2v0M8 7v8a2 2 0 002 2h4a2 2 0 002-2V7M8 7H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Brak rezerwacji</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Nie masz jeszcze żadnych rezerwacji.
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/reserve"
                      className="btn-brand-primary"
                    >
                      Zarezerwuj wizytę
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Firma
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usługa
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data i godzina
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
                            {reservation.companyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {reservation.serviceName || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {reservation.date} o {reservation.startTime}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                              {getStatusText(reservation.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900">
                              Szczegóły
                            </button>
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
      </div>
    </div>
  );
}