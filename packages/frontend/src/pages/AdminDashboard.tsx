import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface Company {
  id: number;
  name: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
}

interface User {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface CompanyRequest {
  id: number;
  companyName: string;
  contactEmail: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  userId?: number | null;
  userEmail?: string | null;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCategory, setNewCompanyCategory] = useState('');
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [decliningId, setDecliningId] = useState<number | null>(null);
  const [requestStatusFilter, setRequestStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  useEffect(() => {
    loadCompanies();
    loadUsers();
    loadRequests();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await api<{ companies: Company[] }>('/companies');
      setCompanies(response.companies);
    } catch (error) {
      console.error('Błąd podczas ładowania firm:', error);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Endpoint może wymagać implementacji w backendzie
      const response = await api<{ users: User[] }>('/admin/users');
      setUsers(response.users);
    } catch (error) {
      console.error('Błąd podczas ładowania użytkowników:', error);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await api<{ requests: CompanyRequest[] } | CompanyRequest[]>(
        '/company-requests'
      );
      const list = Array.isArray(response) ? response : response.requests;
      setRequests(list);
    } catch (error) {
      console.error('Błąd podczas ładowania zgłoszeń firm:', error);
      setRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const createCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    setIsCreatingCompany(true);
    try {
      await api('/companies', {
        method: 'POST',
        body: JSON.stringify({
          name: newCompanyName,
          category: newCompanyCategory || undefined,
        }),
      });
      setNewCompanyName('');
      setNewCompanyCategory('');
      loadCompanies();
    } catch (error) {
      console.error('Błąd podczas tworzenia firmy:', error);
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const toggleCompanyStatus = async (companyId: number, isActive: boolean) => {
    try {
      await api(`/admin/companies/${companyId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ isActive: !isActive }),
      });
      loadCompanies();
    } catch (error) {
      console.error('Błąd podczas zmiany statusu firmy:', error);
    }
  };

  const toggleUserStatus = async (userId: number, isActive: boolean) => {
    try {
      await api(`/admin/users/${userId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ isActive: !isActive }),
      });
      loadUsers();
    } catch (error) {
      console.error('Błąd podczas zmiany statusu użytkownika:', error);
    }
  };

  const approveRequest = async (id: number) => {
    setApprovingId(id);
    try {
      await api(`/company-requests/${id}/approve`, { method: 'POST' });
      await loadRequests();
      await loadCompanies();
    } catch (error) {
      console.error('Błąd podczas zatwierdzania zgłoszenia:', error);
    } finally {
      setApprovingId(null);
    }
  };

  const declineRequest = async (id: number) => {
    setDecliningId(id);
    try {
      await api(`/company-requests/${id}/decline`, { method: 'POST' });
      await loadRequests();
    } catch (error) {
      console.error('Błąd podczas odrzucania zgłoszenia:', error);
    } finally {
      setDecliningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-gray-200 pb-5">
            <h1 className="text-3xl font-bold leading-6 text-gray-900">
              Panel administratora
            </h1>
            <p className="mt-2 max-w-4xl text-sm text-gray-500">
              Witaj, {user?.email}! Zarządzaj firmami i użytkownikami platformy QueueLess.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 sm:px-0 mb-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Firmy</dt>
                      <dd className="text-lg font-medium text-gray-900">{companies.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Użytkownicy</dt>
                      <dd className="text-lg font-medium text-gray-900">{users.length}</dd>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Aktywne firmy</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {companies.filter(c => c.isActive).length}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Aktywni użytkownicy</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {users.filter(u => u.isActive).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Company Form */}
        <div className="px-4 sm:px-0 mb-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Dodaj nową firmę
              </h3>
              <form onSubmit={createCompany} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="company-name" className="block text-sm font-medium text-gray-700">
                      Nazwa firmy
                    </label>
                    <input
                      type="text"
                      id="company-name"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      className="mt-1 input-brand"
                      placeholder="Wprowadź nazwę firmy"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="company-category" className="block text-sm font-medium text-gray-700">
                      Kategoria (opcjonalnie)
                    </label>
                    <input
                      type="text"
                      id="company-category"
                      value={newCompanyCategory}
                      onChange={(e) => setNewCompanyCategory(e.target.value)}
                      className="mt-1 input-brand"
                      placeholder="np. Salon fryzjerski"
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isCreatingCompany}
                    className="btn-brand-primary disabled:opacity-50"
                  >
                    {isCreatingCompany ? 'Tworzenie...' : 'Dodaj firmę'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Company Requests */}
        <div className="px-4 sm:px-0 mb-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Zgłoszenia firm
              </h3>
              {/* Filters */}
              <div className="flex items-center gap-2 mb-4" role="tablist" aria-label="Filtr statusu zgłoszeń">
                {(
                  [
                    { key: 'ALL', label: 'Wszystkie' },
                    { key: 'PENDING', label: 'Oczekujące' },
                    { key: 'APPROVED', label: 'Zatwierdzone' },
                    { key: 'REJECTED', label: 'Odrzucone' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    role="tab"
                    aria-selected={requestStatusFilter === opt.key}
                    onClick={() => setRequestStatusFilter(opt.key)}
                    className={`px-3 py-1 rounded text-sm border ${
                      requestStatusFilter === opt.key
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {isLoadingRequests ? (
                <div className="text-center py-8">
                  <div className="brand-spinner mx-auto mb-4"></div>
                  <p className="text-gray-500">Ładowanie zgłoszeń...</p>
                </div>
              ) : requests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Brak zgłoszeń.</p>
              ) : (
                <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-max w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Firma
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kontakt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Opis
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Źródło
                        </th>
                        <th className="relative px-6 py-3">
                          <span className="sr-only">Akcje</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {requests
                        .filter((r) => requestStatusFilter === 'ALL' || r.status === requestStatusFilter)
                        .map((r) => (
                        <tr key={r.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {r.companyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {r.contactEmail}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate hidden md:table-cell">
                            {r.description || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              r.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-800'
                                : r.status === 'APPROVED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {r.status === 'PENDING'
                                ? 'Oczekuje'
                                : r.status === 'APPROVED'
                                ? 'Zatwierdzono'
                                : 'Odrzucono'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(r.createdAt).toLocaleDateString('pl-PL')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                            {r.userEmail || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                            {r.status === 'PENDING' ? (
                              <>
                                <button
                                  onClick={() => approveRequest(r.id)}
                                  disabled={approvingId === r.id}
                                  aria-label={`Zatwierdź zgłoszenie firmy ${r.companyName}`}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                >
                                  {approvingId === r.id ? 'Zatwierdzanie...' : 'Zatwierdź'}
                                </button>
                                <button
                                  onClick={() => declineRequest(r.id)}
                                  disabled={decliningId === r.id}
                                  aria-label={`Odrzuć zgłoszenie firmy ${r.companyName}`}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                >
                                  {decliningId === r.id ? 'Odrzucanie...' : 'Odrzuć'}
                                </button>
                              </>
                            ) : null}
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

        {/* Companies Table */}
        <div className="px-4 sm:px-0 mb-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Zarządzanie firmami
              </h3>
              {isLoadingCompanies ? (
                <div className="text-center py-8">
                  <div className="brand-spinner mx-auto mb-4"></div>
                  <p className="text-gray-500">Ładowanie firm...</p>
                </div>
              ) : (
                <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-max w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nazwa
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kategoria
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
                      {companies.map((company) => (
                        <tr key={company.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {company.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {company.category || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              company.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {company.isActive ? 'Aktywna' : 'Nieaktywna'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => toggleCompanyStatus(company.id, company.isActive)}
                              aria-label={`${company.isActive ? 'Dezaktywuj' : 'Aktywuj'} firmę ${company.name}`}
                              className={`${
                                company.isActive 
                                  ? 'text-red-600 hover:text-red-900' 
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              {company.isActive ? 'Dezaktywuj' : 'Aktywuj'}
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

        {/* Users Table */}
        <div className="px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Zarządzanie użytkownikami
              </h3>
              {isLoadingUsers ? (
                <div className="text-center py-8">
                  <div className="brand-spinner mx-auto mb-4"></div>
                  <p className="text-gray-500">Ładowanie użytkowników...</p>
                </div>
              ) : users.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Brak danych o użytkownikach (endpoint może wymagać implementacji)
                </p>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rola
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
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.role}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.isActive ? 'Aktywny' : 'Zablokowany'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => toggleUserStatus(user.id, user.isActive)}
                              aria-label={`${user.isActive ? 'Zablokuj' : 'Odblokuj'} użytkownika ${user.email}`}
                              className={`${
                                user.isActive 
                                  ? 'text-red-600 hover:text-red-900' 
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              {user.isActive ? 'Zablokuj' : 'Odblokuj'}
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
