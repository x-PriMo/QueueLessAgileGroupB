import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import WeeklySchedule from './WeeklySchedule';

interface Company {
  id: number;
  name: string;
}

interface OwnerScheduleManagerProps {
  companyId?: number;
}

export default function OwnerScheduleManager({ companyId }: OwnerScheduleManagerProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(companyId || null);
  const [loading, setLoading] = useState(!companyId);

  useEffect(() => {
    if (companyId) {
      setSelectedCompanyId(companyId);
    } else {
      loadCompanies();
    }
  }, [companyId]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await api<{ companies: Company[] }>('/companies/owner/companies');
      setCompanies(response.companies);
      if (response.companies.length > 0) {
        setSelectedCompanyId(response.companies[0].id);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Ładowanie...</div>;
  }

  if (!selectedCompanyId) {
    return (
      <div className="p-8 text-center text-gray-500">
        Nie znaleziono firm.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!companyId && companies.length > 1 && (
        <div className="flex justify-end px-4">
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
            className="input-brand max-w-xs"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
      <WeeklySchedule companyId={selectedCompanyId} />
    </div>
  );
}
