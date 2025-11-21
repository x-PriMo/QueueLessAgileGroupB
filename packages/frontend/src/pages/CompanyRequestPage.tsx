import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export default function CompanyRequestPage() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Pobierz listę kategorii z backendu, aby wypełnić selektor
    // Endpoint zwraca obiekty { category, count }, mapujemy do nazw kategorii
    (async () => {
      try {
        const res = await api<{ categories: { category: string; count: number }[] }>(
          '/companies/categories/list'
        );
        setAvailableCategories(res.categories.map((c) => c.category));
      } catch (e) {
        // fallback: minimalny zestaw kategorii
        setAvailableCategories([
          'Salon fryzjerski',
          'Barber',
          'Salon kosmetyczny',
          'Dentysta',
          'Przychodnia',
          'Fizjoterapia',
          'Weterynarz',
          'Mechanik',
          'Inne',
        ]);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      await api<{ id: number; message: string }>(
        '/company-requests',
        {
          method: 'POST',
          body: JSON.stringify({ companyName, description, contactEmail, address, category })
        }
      );
      setMessage('Wniosek został złożony. Czekamy na jego rozpatrzenie przez Administratora.');
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nie udało się wysłać zgłoszenia.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Zgłoszenie firmy</h1>
          <p className="text-gray-600 mb-6">Wypełnij poniższe pola, aby zgłosić chęć dołączenia jako firma. Zgłoszenie nie tworzy firmy automatycznie — administrator je zweryfikuje i przydzieli rolę OWNER.</p>
          {!submitted ? (
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nazwa firmy</label>
              <input
                className="input-brand"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                placeholder="np. Salon Fryzjerski XYZ"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">E-mail kontaktowy</label>
              <input
                className="input-brand"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                placeholder="np. kontakt@firma.pl"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Adres firmy</label>
              <input
                className="input-brand"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                placeholder="np. ul. Długa 12, 00-001 Warszawa"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Kategoria firmy</label>
              <select
                className="input-brand"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="" disabled>Wybierz kategorię</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Opis (opcjonalnie)</label>
              <textarea
                className="input-brand"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Krótki opis firmy i usług."
              />
            </div>

            <div>
              <button type="submit" disabled={isLoading} className="btn-brand-primary w-full">
                {isLoading ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
              </button>
            </div>
          </form>
          ) : (
            <div role="status" aria-live="polite" className="status-info mt-4">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-4a1 1 0 011 1v2.586l1.293 1.293a1 1 0 11-1.414 1.414L9 10.414V7a1 1 0 011-1z" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-900">Wniosek złożony</p>
                  <p className="text-gray-700">{message ?? 'Czekamy na rozpatrzenie przez Administratora.'}</p>
                </div>
              </div>
              <div className="mt-6 flex items-center space-x-3">
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => setSubmitted(false)}
                >
                  Złóż kolejny wniosek
                </button>
                <a href="/" className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200">
                  Strona główna
                </a>
              </div>
            </div>
          )}

          {!submitted && message && (
            <div className="status-success mt-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="font-medium">{message}</p>
              </div>
            </div>
          )}
          {error && (
            <div className="status-error mt-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
