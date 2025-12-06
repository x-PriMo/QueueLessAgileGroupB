import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

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
  workersCanAccept?: boolean;
}

export default function OwnerCompanySettings() {
  const [company, setCompany] = useState<Company | null>(null);
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
    autoAccept: true,
    workersCanAccept: false
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Pobierz pierwszą firmę właściciela
      const companiesRes = await api<{ companies: Company[] }>('/companies/owner/companies');
      if (companiesRes.companies.length > 0) {
        const companyData = companiesRes.companies[0];
        setCompany(companyData);

        // Parse address
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
          autoAccept: Boolean(companyData.autoAccept),
          workersCanAccept: Boolean(companyData.workersCanAccept)
        });
      }

      // Pobierz kategorie
      const catsRes = await api<{ categories: { category: string, count: number }[] }>('/companies/categories');
      setCategories(catsRes.categories.map(c => c.category));
    } catch (err) {
      setError('Błąd podczas ładowania danych');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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
    if (!company) return;

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

      const response = await api<{ company: Company }>(`/companies/${company.id}`, {
        method: 'PUT',
        body: JSON.stringify(dataToSend),
      });

      setCompany(response.company);

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
        autoAccept: Boolean(response.company.autoAccept),
        workersCanAccept: Boolean(response.company.workersCanAccept)
      });

      setMessage('Ustawienia firmy zaktualizowane pomyślnie');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wystąpił błąd podczas aktualizacji';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Dozwolone tylko PNG/JPG');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError('Plik za duży (>6MB)');
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const base64Data = dataUrl.split(',')[1];
      const response = await api<{ logoUrl: string }>(`/companies/${company.id}/logo`, {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, base64Data }),
      });

      setCompany(prev => prev ? { ...prev, logoPath: response.logoUrl } : null);
      setMessage('Logo zaktualizowane');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wystąpił błąd';
      setError(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="brand-spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Ładowanie ustawień firmy...</p>
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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Podstawowe informacje</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* Logo Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-3">Logo firmy</h3>
        <div className="flex items-center space-x-4 mb-4">
          {company.logoPath ? (
            <img src={`http://localhost:3001${company.logoPath}`} alt="Logo" className="h-20 w-20 object-contain border rounded-lg" />
          ) : (
            <div className="h-20 w-20 bg-gray-200 flex items-center justify-center text-sm rounded-lg">Brak logo</div>
          )}
          <div>
            <p className="font-medium">{company.name}</p>
            <p className="text-sm text-gray-600">PNG/JPG, min. 256×256px, max. 6MB</p>
          </div>
        </div>
        <input type="file" accept="image/png,image/jpeg" onChange={handleLogoUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
      </div>

      {/* AutoAccept & WorkersCanAccept Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AutoAccept Toggle */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Automatyczna akceptacja
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Włącz automatyczne zatwierdzanie rezerwacji.
              </p>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                {formData.autoAccept ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Włączona
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                    Wyłączona
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (isLoading) return;
                const newValue = !formData.autoAccept;
                setFormData(prev => ({ ...prev, autoAccept: newValue }));

                try {
                  setIsLoading(true);
                  setError('');
                  setMessage('');

                  const addressString = [formData.street, formData.city, formData.buildingNumber].filter(Boolean).join(', ');

                  const response = await api<{ company: Company }>(`/companies/${company.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                      ...formData,
                      address: addressString,
                      autoAccept: newValue
                    }),
                  });

                  setCompany(response.company);
                  setMessage(`Automatyczna akceptacja ${newValue ? 'włączona' : 'wyłączona'} ✓`);
                } catch (err) {
                  setFormData(prev => ({ ...prev, autoAccept: !newValue }));
                  setError('Nie udało się zaktualizować ustawienia');
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className={`
                relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50
                ${formData.autoAccept ? 'bg-green-600' : 'bg-gray-300'}
              `}
            >
              <span className={`
                inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform
                ${formData.autoAccept ? 'translate-x-7' : 'translate-x-1'}
              `} />
            </button>
          </div>
        </div>

        {/* WorkersCanAccept Toggle */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Uprawnienia pracowników
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Pozwól pracownikom akceptować rezerwacje.
              </p>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                {formData.workersCanAccept ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Mogą akceptować
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Tylko właściciel
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (isLoading) return;
                const newValue = !formData.workersCanAccept;
                setFormData(prev => ({ ...prev, workersCanAccept: newValue }));

                try {
                  setIsLoading(true);
                  setError('');
                  setMessage('');

                  const addressString = [formData.street, formData.city, formData.buildingNumber].filter(Boolean).join(', ');

                  const response = await api<{ company: Company }>(`/companies/${company.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                      ...formData,
                      address: addressString,
                      workersCanAccept: newValue
                    }),
                  });

                  setCompany(response.company);
                  setMessage(`Uprawnienia pracowników zaktualizowane ✓`);
                } catch (err) {
                  setFormData(prev => ({ ...prev, workersCanAccept: !newValue }));
                  setError('Nie udało się zaktualizować uprawnień');
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className={`
                relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50
                ${formData.workersCanAccept ? 'bg-purple-600' : 'bg-gray-300'}
              `}
            >
              <span className={`
                inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform
                ${formData.workersCanAccept ? 'translate-x-7' : 'translate-x-1'}
              `} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {(message || error) && (
        <div className={`p-4 rounded-lg ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {error || message}
        </div>
      )}
    </div>
  );
}
