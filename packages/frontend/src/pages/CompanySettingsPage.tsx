import React, { useEffect, useState } from 'react';
import { api, API_URL } from '../lib/api';
import { useParams } from 'react-router-dom';
import OwnerScheduleManager from '../components/OwnerScheduleManager';

interface Company {
  id: number;
  name: string;
  timezone: string;
  logoPath?: string;
  address?: string;
  phone?: string;
  contactEmail?: string;
  website?: string;
  category?: string;
  description?: string;
  slotMinutes?: number;
  traineeExtraMinutes?: number;
  autoAccept?: boolean;
}

export default function CompanySettingsPage() {
  const { companyId } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({
    todayReservations: 0,
    totalRevenue: 0,
    activeWorkers: 0,
    weeklyTrend: 0
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    street: '',
    city: '',
    buildingNumber: '',
    phone: '',
    contactEmail: '',
    website: '',
    category: '',
    slotMinutes: 30,
    traineeExtraMinutes: 15,
    autoAccept: true
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Pobierz dane firmy
        const companyRes = await api<{ company: Company }>(`/companies/${companyId}`);
        const companyData = companyRes.company;
        setCompany(companyData);

        // Ustaw dane formularza
        // Parse address if it exists
        const addressParts = (companyData.address || '').split(',').map(s => s.trim());

        setFormData({
          name: companyData.name || '',
          description: companyData.description || '',
          street: addressParts[0] || '',
          city: addressParts[1] || '',
          buildingNumber: addressParts[2] || '',
          phone: companyData.phone || '',
          contactEmail: companyData.contactEmail || '',
          website: companyData.website || '',
          category: companyData.category || '',
          slotMinutes: companyData.slotMinutes || 30,
          traineeExtraMinutes: companyData.traineeExtraMinutes || 15,
          autoAccept: Boolean(companyData.autoAccept)
        });


        // Pobierz kategorie
        const catsRes = await api<{ categories: { category: string, count: number }[] }>('/companies/categories');
        setCategories(catsRes.categories.map(c => c.category));

        // Pobierz statystyki
        const statsRes = await api<{ stats: typeof stats }>(`/companies/${companyId}/stats`);
        setStats(statsRes.stats);

      } catch (err) {
        setError('Błąd podczas ładowania danych');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [companyId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
        type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError('');
      setMessage('');

      // Combine address fields
      const addressString = [formData.street, formData.city, formData.buildingNumber]
        .filter(Boolean)
        .join(', ');

      const dataToSend = {
        ...formData,
        address: addressString
      };

      const response = await api<{ company: Company }>(`/companies/${companyId}`, {
        method: 'PUT',
        body: JSON.stringify(dataToSend),
      });

      setCompany(response.company);

      // Update formData with response to sync state
      const addressParts = (response.company.address || '').split(',').map(s => s.trim());
      setFormData({
        name: response.company.name || '',
        description: response.company.description || '',
        street: addressParts[0] || '',
        city: addressParts[1] || '',
        buildingNumber: addressParts[2] || '',
        phone: response.company.phone || '',
        contactEmail: response.company.contactEmail || '',
        website: response.company.website || '',
        category: response.company.category || '',
        slotMinutes: response.company.slotMinutes || 30,
        traineeExtraMinutes: response.company.traineeExtraMinutes || 15,
        autoAccept: Boolean(response.company.autoAccept)
      });

      setMessage('Ustawienia firmy zaktualizowane pomyślnie');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wystąpił błąd podczas aktualizacji';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setMessage('Dozwolone PNG/JPG');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setMessage('Plik za duży (>6MB)');
      return;
    }
    // Sprawdzenie wymiarów (≥256×256)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const imgOk = await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.width >= 256 && img.height >= 256);
      img.onerror = () => resolve(false);
      img.src = dataUrl;
    });
    if (!imgOk) {
      setMessage('Logo za małe (min 256×256)');
      return;
    }
    const base64Data = dataUrl.split(',')[1];
    try {
      const res = await api<{ logoUrl: string }>(`/companies/${companyId}/logo`, {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, base64Data }),
      });
      setCompany((c) => (c ? { ...c, logoPath: res.logoUrl } : c));
      setMessage('Logo zaktualizowane.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wystąpił błąd';
      setMessage(msg);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="brand-spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Ładowanie ustawień firmy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ustawienia firmy</h1>
          <p className="mt-2 text-gray-600">Zarządzaj swoją firmą i ustawieniami</p>
        </div>

        {/* Statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Podstawowe informacje */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">Podstawowe informacje</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa firmy</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="input-brand w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategoria</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="input-brand w-full"
                    >
                      <option value="">Wybierz kategorię</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opis firmy</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="input-brand w-full"
                    placeholder="Opisz swoją firmę i oferowane usługi..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ulica</label>
                      <input
                        type="text"
                        name="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        className="input-brand w-full"
                        placeholder="ul. Przykładowa"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Miejscowość</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="input-brand w-full"
                        placeholder="Warszawa"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nr budynku/lokalu</label>
                      <input
                        type="text"
                        name="buildingNumber"
                        value={formData.buildingNumber}
                        onChange={handleInputChange}
                        className="input-brand w-full"
                        placeholder="12/5"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon kontaktowy</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="input-brand w-full"
                      placeholder="+48 123 456 789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email kontaktowy</label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleInputChange}
                      className="input-brand w-full"
                      placeholder="kontakt@firma.pl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strona internetowa</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="input-brand w-full"
                    placeholder="https://www.firma.pl"
                  />
                </div>

                {/* Ustawienia systemowe - moved inside form */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-2">Ustawienia techniczne</h3>
                  <p className="text-sm text-gray-500 mb-4">Zaawansowane ustawienia dla systemu rezerwacji (opcjonalne)</p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="hidden">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Czas slotu (min)</label>
                        <input
                          type="number"
                          name="slotMinutes"
                          value={formData.slotMinutes}
                          onChange={handleInputChange}
                          min="5"
                          max="300"
                          className="input-brand w-full"
                        />
                      </div>

                      <div className="hidden">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dodatkowy czas praktykanta (min)</label>
                        <input
                          type="number"
                          name="traineeExtraMinutes"
                          value={formData.traineeExtraMinutes}
                          onChange={handleInputChange}
                          min="0"
                          max="120"
                          className="input-brand w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-brand disabled:opacity-50"
                  >
                    {isLoading ? 'Zapisywanie...' : 'Zapisz wszystkie zmiany'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Logo i komunikaty */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">Logo firmy</h2>

              {company && (
                <div className="flex items-center space-x-4 mb-4">
                  {company.logoPath ? (
                    <img src={`${API_URL}${company.logoPath}`} alt="Logo" className="h-20 w-20 object-contain border rounded-lg" />
                  ) : (
                    <div className="h-20 w-20 bg-gray-200 flex items-center justify-center text-sm rounded-lg">Brak logo</div>
                  )}
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-sm text-gray-600">PNG/JPG, min. 256×256px, max. 6MB</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prześlij nowe logo</label>
                <input type="file" accept="image/png,image/jpeg" onChange={onUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
            </div>

            {/* AutoAccept Toggle Section - Separate with instant save */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Automatyczna akceptacja rezerwacji
                  </h2>
                  <p className="text-sm text-gray-600 mb-3">
                    Włącz automatyczne zatwierdzanie rezerwacji lub wymagaj ręcznej akceptacji każdego zamówienia.
                  </p>

                  {/* Status badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    {formData.autoAccept ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Włączona
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Wyłączona
                      </span>
                    )}
                  </div>
                </div>

                {/* Large Toggle Button */}
                <button
                  type="button"
                  onClick={async () => {
                    const newValue = !formData.autoAccept;

                    // Immediately save to backend
                    try {
                      setIsLoading(true);
                      setError('');
                      setMessage('');

                      const addressString = [formData.street, formData.city, formData.buildingNumber]
                        .filter(Boolean)
                        .join(', ');

                      const response = await api<{ company: Company }>(`/companies/${companyId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ ...formData, autoAccept: newValue, address: addressString }),
                      });

                      setCompany(response.company);
                      setMessage(`Automatyczna akceptacja ${newValue ? 'włączona' : 'wyłączona'} ✓`);

                      // Sync formData with response
                      const addressParts = (response.company.address || '').split(',').map(s => s.trim());
                      setFormData({
                        name: response.company.name || '',
                        description: response.company.description || '',
                        street: addressParts[0] || '',
                        city: addressParts[1] || '',
                        buildingNumber: addressParts[2] || '',
                        phone: response.company.phone || '',
                        contactEmail: response.company.contactEmail || '',
                        website: response.company.website || '',
                        category: response.company.category || '',
                        slotMinutes: response.company.slotMinutes || 30,
                        traineeExtraMinutes: response.company.traineeExtraMinutes || 15,
                        autoAccept: Boolean(response.company.autoAccept)
                      });
                    } catch (err) {
                      setError('Nie udało się zaktualizować ustawienia autoakceptacji');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className={`
                    relative inline-flex h-14 w-28 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50
                    ${formData.autoAccept ? 'bg-green-600' : 'bg-gray-300'}
                  `}
                >
                  <span className="sr-only">Toggle auto-accept</span>
                  <span
                    className={`
                      inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform
                      ${formData.autoAccept ? 'translate-x-16' : 'translate-x-2'}
                    `}
                  />
                </button>
              </div>

              {/* Help text */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Co to oznacza?</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Włączona:</strong> Klienci rezerwują i od razu dostają potwierdzenie. Szybko i automatycznie.</li>
                      <li><strong>Wyłączona:</strong> Musisz ręcznie zaakceptować lub odrzucić każdą rezerwację w panelu kolejki.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Komunikaty */}
            {(message || error) && (
              <div className={`p-4 rounded-lg ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {error || message}
              </div>
            )}
          </div>
        </div>

        {/* Grafik pracowników */}
        <div className="mt-8">
          <OwnerScheduleManager companyId={Number(companyId)} />
        </div>
      </div>
    </div>
  );
}
