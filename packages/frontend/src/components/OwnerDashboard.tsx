import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Stats {
  todayReservations: number;
  totalRevenue: number;
  activeWorkers: number;
  weeklyTrend: number;
}

interface Company {
  id: number;
  name: string;
  category?: string;
  description?: string;
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<Stats>({
    todayReservations: 0,
    totalRevenue: 0,
    activeWorkers: 0,
    weeklyTrend: 0
  });
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Pobierz pierwszą firmę właściciela
      const companiesRes = await api<{ companies: Company[] }>('/companies/owner/companies');
      if (companiesRes.companies.length > 0) {
        const companyData = companiesRes.companies[0];
        setCompany(companyData);
        
        // Pobierz statystyki
        const statsRes = await api<{ stats: Stats }>(`/companies/${companyData.id}/stats`);
        setStats(statsRes.stats);
      }
    } catch (err) {
      setError('Błąd podczas ładowania danych');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="brand-spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <p className="text-gray-500">Nie masz przypisanej żadnej firmy</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Powitanie */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Witaj, {company.name}!</h1>
        <p className="text-gray-600 mt-2">
          {company.category || 'Firma'} • {company.description || 'Brak opisu'}
        </p>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-blue-600">{stats.todayReservations}</div>
          <div className="text-sm text-gray-600">Rezerwacje dzisiaj</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600">{stats.totalRevenue} zł</div>
          <div className="text-sm text-gray-600">Przychód dzisiaj</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-purple-600">{stats.activeWorkers}</div>
          <div className="text-sm text-gray-600">Aktywni pracownicy</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-orange-600">{stats.weeklyTrend}%</div>
          <div className="text-sm text-gray-600">Trend tygodniowy</div>
        </div>
      </div>

      {/* Szybkie akcje */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Szybkie akcje</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">📊 Statystyki</h3>
            <p className="text-sm text-gray-600 mb-3">Sprawdź szczegółowe statystyki swojej firmy</p>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Przejdź do statystyk →
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">✂️ Usługi</h3>
            <p className="text-sm text-gray-600 mb-3">Zarządzaj oferowanymi usługami i cenami</p>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Zarządzaj usługami →
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">👥 Pracownicy</h3>
            <p className="text-sm text-gray-600 mb-3">Dodaj nowych pracowników i zarządzaj nimi</p>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Zarządzaj pracownikami →
            </button>
          </div>
        </div>
      </div>

      {/* Ostatnie rezerwacje */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Dzisiejsze rezerwacje</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">Brak rezerwacji na dziś</p>
          <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm">
            Sprawdź pełny kalendarz →
          </button>
        </div>
      </div>
    </div>
  );
}