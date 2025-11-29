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
    address: '',
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
        setFormData({
          name: companyData.name || '',
          description: companyData.description || '',
          address: companyData.address || '',
          phone: companyData.phone || '',
          contactEmail: companyData.contactEmail || '',
          website: companyData.website || '',
          category: companyData.category || '',
          slotMinutes: companyData.slotMinutes || 30,
          traineeExtraMinutes: companyData.traineeExtraMinutes || 15,
          autoAccept: companyData.autoAccept || false
        });

        // Pobierz kategorie
        const catsRes = await api<{ categories: {category: string, count: number}[] }>('/companies/categories');
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
      
      const response = await api<{ company: Company }>(`/companies/${companyId}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      
      setCompany(response.company);
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
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="input-brand w-full"
                    placeholder="ul. Przykładowa 12, 00-001 Warszawa"
                  />
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

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-brand disabled:opacity-50"
                  >
                    {isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                  </button>
                </div>
              </form>
            </div>

            {/* Ustawienia systemowe */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-6">Ustawienia systemowe</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
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
                  
                  <div>
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
                  
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="autoAccept"
                        checked={formData.autoAccept}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Automatyczna akceptacja</span>
                    </label>
                  </div>
                </div>
              </div>
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
