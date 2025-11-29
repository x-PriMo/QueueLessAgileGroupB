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
}

export default function OwnerCompanySettings() {
  const [company, setCompany] = useState<Company | null>(null);
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
      }

      // Pobierz kategorie
      const catsRes = await api<{ categories: {category: string, count: number}[] }>('/companies/categories');
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
      
      const response = await api<{ company: Company }>(`/companies/${company.id}`, {
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

        <div className="mt-4">
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

        <div className="mt-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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

        <div className="mt-4">
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

        {/* Logo */}
        <div className="mt-6">
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

        {/* Komunikaty */}
        {(message || error) && (
          <div className={`mt-4 p-4 rounded-lg ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {error || message}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn-brand disabled:opacity-50"
          >
            {isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>
        </div>
      </div>

      {/* Ustawienia systemowe */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Ustawienia systemowe</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
  );
}
