import React, { useEffect, useState } from 'react';
import { api, API_URL } from '../lib/api';
import { Link, useLocation } from 'react-router-dom';

interface Company {
  id: number;
  name: string;
  logoPath?: string;
  timezone: string;
  category?: string;
  description?: string;
}

interface FormErrors {
  email?: string;
  date?: string;
  time?: string;
  companyId?: string;
}

// Typy pomocnicze do panelu rezerwacji inline
interface WorkingHours {
  id: number;
  dayOfWeek: number;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

interface ReservationItem {
  id: number;
  email: string;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:mm
  status: string;
}

interface Worker {
  id: number;
  email: string;
  role: string;
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: { label: string; description: string }[];
}

function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="step-indicator">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={stepNumber}>
            <div className={`step-item ${isActive ? 'active' : isCompleted ? 'completed' : 'inactive'}`}>
              <div className={`step-circle ${isActive ? 'active' : isCompleted ? 'completed' : 'inactive'}`}>
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <div className="ml-3 hidden sm:block">
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="text-xs opacity-75">{step.description}</p>
              </div>
            </div>
            {!isLast && (
              <div className={`step-connector ${isActive || isCompleted ? 'active' : 'inactive'}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface CompanyCardProps {
  company: Company;
  isSelected: boolean;
  onSelect: () => void;
}

function CompanyCard({ company, isSelected, onSelect }: CompanyCardProps) {
  return (
    <div
      className={`company-card ${isSelected ? 'selected' : 'unselected'} hover-lift`}
      onClick={onSelect}
    >
      <div className="flex items-center space-x-4">
        <div className="company-logo-container">
          {company.logoPath ? (
            <img
              src={`${API_URL}${company.logoPath}`}
              alt={`Logo ${company.name}`}
              className="h-full w-full object-contain rounded-lg"
            />
          ) : (
            <div className="company-logo-fallback">
              <span className="text-white font-bold text-xl">
                {company.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{company.name}</h3>
          {company.category && (
            <p className="text-sm text-blue-600 font-medium">{company.category}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            {/* Zamiast strefy czasowej wyświetl adres (miasto, ulica) z opisu, jeśli dostępny */}
            {company.description ? company.description.split(' — ')[0] : 'Adres niedostępny'}
          </p>
          {company.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{company.description}</p>
          )}
          <div className="mt-3">
            <Link
              to={`/company/${company.id}`}
              className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
              onClick={(e) => e.stopPropagation()}
            >
              Podgląd firmy
            </Link>
          </div>
        </div>
        {isSelected && (
          <div className="text-blue-600">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// Helpery slotów czasu
function timeRangeToSlots(start: string, end: string, minutesStep: number): string[] {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const slots: string[] = [];
  let cur = new Date(2000, 0, 1, sh, sm, 0, 0);
  const limit = new Date(2000, 0, 1, eh, em, 0, 0);
  while (cur < limit) {
    const hh = String(cur.getHours()).padStart(2, '0');
    const mm = String(cur.getMinutes()).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
    cur = new Date(cur.getTime() + minutesStep * 60_000);
  }
  return slots;
}

function dayOfWeekForDate(d: string): number | null {
  if (!d) return null;
  const dateObj = new Date(d);
  return dateObj.getDay(); // 0=Sunday ... 6=Saturday
}

interface InlineReservationPanelProps {
  companyId: number;
  onChoose: (date: string, time: string) => void;
}

function InlineReservationPanel({ companyId, onChoose }: InlineReservationPanelProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | 'any'>('any');
  const [localDate, setLocalDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      api<{ workers: Worker[] }>(`/companies/${companyId}/workers`),
      api<{ workingHours: WorkingHours[] }>(`/working-hours/company/${companyId}`),
      api<{ reservations: ReservationItem[] }>(`/reservations/company/${companyId}`),
    ])
      .then(([w, wh, r]) => {
        if (cancelled) return;
        setWorkers(w.workers || []);
        setWorkingHours(wh.workingHours || []);
        setReservations(r.reservations || []);
      })
      .catch(() => {
        if (cancelled) return;
        setWorkers([]);
        setWorkingHours([]);
        setReservations([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [companyId]);

  const freeSlots: string[] = React.useMemo(() => {
    if (!localDate) return [];
    const dow = dayOfWeekForDate(localDate);
    if (dow === null) return [];
    const dayHours = workingHours.find((wh) => wh.dayOfWeek === dow);
    if (!dayHours) return [];
    const baseSlots = timeRangeToSlots(dayHours.startTime, dayHours.endTime, 30);
    const reservedTimes = reservations
      .filter((r) => r.date === localDate)
      .map((r) => r.startTime);
    return baseSlots.filter((t) => !reservedTimes.includes(t));
  }, [localDate, workingHours, reservations]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="input-label">Pracownik</label>
          <select
            className="input-brand"
            value={String(selectedWorkerId)}
            onChange={(e) => {
              const v = e.target.value === 'any' ? 'any' : Number(e.target.value);
              setSelectedWorkerId(v);
            }}
          >
            <option value="any">Dowolny dostępny</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>{w.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="input-label">Data</label>
          <input
            type="date"
            className="input-brand"
            value={localDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setLocalDate(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            className="btn-brand-secondary w-full"
            onClick={() => {
              // Bez przejścia — sloty pokażą się poniżej po wyborze daty
            }}
          >
            Wybierz termin
          </button>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Wolne terminy</h3>
        {localDate ? (
          freeSlots.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {freeSlots.map((t) => (
                <button
                  key={t}
                  className="px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50"
                  onClick={() => onChoose(localDate, t)}
                >
                  {t}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Brak wolnych terminów dla wybranej daty.</p>
          )
        ) : (
          <p className="text-gray-600">Wybierz datę, aby zobaczyć dostępne sloty.</p>
        )}
      </div>
    </div>
  );
}

export default function ReservationPage() {
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [workerId, setWorkerId] = useState<number | null>(null);
  const [expandedCompanyId, setExpandedCompanyId] = useState<number | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState(1);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const location = useLocation();

  const steps = [
    { label: 'Wybór firmy', description: 'Znajdź odpowiednią firmę' },
    { label: 'Szczegóły', description: 'Podaj dane rezerwacji' },
    { label: 'Potwierdzenie', description: 'Zakończ rezerwację' }
  ];

  useEffect(() => {
    // Prefill ze state (przejście z widoku firmy)
    const state = location.state as {
      companyId?: number;
      serviceId?: number;
      date?: string;
      time?: string;
      workerId?: number;
    } | null;

    if (state && state.companyId) {
      setCompanyId(state.companyId);
      if (state.serviceId) setServiceId(state.serviceId);
      if (state.workerId) setWorkerId(state.workerId);
      if (state.date) setDate(state.date);
      if (state.time) setTime(state.time);
      setStep(2);
    }

    // Pobierz listę kategorii
    api<{ categories: { category: string; count: number }[] }>(
      '/companies/categories/list'
    )
      .then((x) => setCategories(x.categories || []))
      .catch(() => setCategories([]));
  }, [location.state]);

  // Jeśli wybrana kategoria zniknęła z listy (np. po zmianie taksonomii), wyczyść filtr
  useEffect(() => {
    if (selectedCategory && !categories.find((c) => c.category === selectedCategory)) {
      setSelectedCategory('');
    }
  }, [categories]);

  useEffect(() => {
    // Pobierz firmy z filtrowaniem wg kategorii i wyszukiwaniem
    setIsLoadingCompanies(true);
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (searchQuery) params.set('q', searchQuery);
    const path = `/companies${params.toString() ? `?${params.toString()}` : ''}`;
    api<{ companies: Company[] }>(path)
      .then((x) => {
        const list = x.companies || [];
        setCompanies(list);
      })
      .catch(() => setCompanies([]))
      .finally(() => setIsLoadingCompanies(false));
  }, [selectedCategory, searchQuery]);

  // Preselekcja firmy przez query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('companyId');
    if (cid) {
      const idNum = Number(cid);
      if (!isNaN(idNum)) {
        setCompanyId(idNum);
        setStep(2);
      }
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email) {
      newErrors.email = 'E-mail jest wymagany';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Nieprawidłowy format e-mail';
    }

    if (!date) {
      newErrors.date = 'Data jest wymagana';
    } else {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'Data nie może być z przeszłości';
      }
    }

    if (!time) {
      newErrors.time = 'Godzina jest wymagana';
    }

    if (!companyId) {
      newErrors.companyId = 'Wybierz firmę';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await api<{ id: number }>('/reservations', {
        method: 'POST',
        body: JSON.stringify({ 
          companyId: Number(companyId), 
          email, 
          date, 
          startTime: time,
          serviceId: serviceId ?? undefined,
          workerId: workerId ?? undefined,
        }),
      });
      setMessage('Rezerwacja została pomyślnie utworzona! Sprawdź swoją skrzynkę e-mail.');
      setHasError(false);
      setStep(3);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wystąpił błąd podczas tworzenia rezerwacji';
      setMessage(msg);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  const selectedCompany = companies.find(c => c.id === companyId);
  const progressPercentage = ((step - 1) / (steps.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="heading-responsive text-gray-900 mb-4">
            Zarezerwuj wizytę
          </h1>
          <p className="body-responsive text-gray-600 max-w-2xl mx-auto">
            Wybierz dogodny termin i zarezerwuj swoją wizytę online w kilku prostych krokach
          </p>
          
          {/* Progress Bar */}
          <div className="progress-bar mt-8 max-w-md mx-auto">
            <div 
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} totalSteps={steps.length} steps={steps} />

        {step < 3 ? (
          <div className="card-brand max-w-3xl mx-auto">
            <form onSubmit={onSubmit} className="space-y-8">
              {/* Step 1: Company Selection */}
              {step >= 1 && (
                <div className="form-section">
                  <div className="form-section-header">
                    <h2 className="form-section-title">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 114 0 2 2 0 01-4 0zm8 0a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
                      </svg>
                      Wybierz firmę
                    </h2>
                    <p className="form-section-description">
                      Najpierw wybierz kategorię branży, a następnie firmę
                    </p>
                  </div>

                  {/* Kategorie */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`px-3 py-1 rounded-full text-sm border ${
                          selectedCategory === '' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'
                        }`}
                        onClick={() => setSelectedCategory('')}
                      >
                        Wszystkie
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.category}
                          type="button"
                          className={`px-3 py-1 rounded-full text-sm border ${
                            selectedCategory === c.category ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'
                          }`}
                          onClick={() => setSelectedCategory(c.category)}
                        >
                          {c.category} ({c.count})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wyszukiwarka */}
                  <div className="mb-6">
                    <div className="relative">
                      <input
                        type="text"
                        className="input-brand pl-10"
                        placeholder="Szukaj firm po nazwie lub opisie..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {isLoadingCompanies ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center space-x-4 p-6 border border-gray-200 rounded-xl">
                          <div className="skeleton-avatar"></div>
                          <div className="flex-1 space-y-2">
                            <div className="skeleton-text w-1/3"></div>
                            <div className="skeleton-text w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="selection-grid cols-1">
                      {companies.map((company) => (
                        <div key={company.id} className="space-y-3">
                          <CompanyCard
                            company={company}
                            isSelected={expandedCompanyId === company.id}
                            onSelect={() => {
                              setExpandedCompanyId(expandedCompanyId === company.id ? null : company.id);
                            }}
                          />
                          {expandedCompanyId === company.id && (
                            <InlineReservationPanel
                              companyId={company.id}
                              onChoose={(d, t) => {
                                setCompanyId(company.id);
                                setDate(d);
                                setTime(t);
                                if (step === 1) {
                                  setTimeout(() => setStep(2), 200);
                                }
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.companyId && (
                    <div className="status-error">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{errors.companyId}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Reservation Details */}
              {step >= 2 && selectedCompany && (
                <div className="form-section">
                  <div className="form-section-header">
                    <h2 className="form-section-title">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      Szczegóły rezerwacji
                    </h2>
                    <p className="form-section-description">
                      Podaj swoje dane kontaktowe i wybierz termin wizyty
                    </p>
                  </div>

                  {/* Selected Company Summary */}
                  <div className="status-info">
                    <div className="flex items-center space-x-4">
                      <div className="company-logo-container">
                        {selectedCompany.logoPath ? (
                          <img
                            src={`${API_URL}${selectedCompany.logoPath}`}
                            alt={`Logo ${selectedCompany.name}`}
                            className="h-full w-full object-contain rounded-lg"
                          />
                        ) : (
                          <div className="company-logo-fallback">
                            <span className="text-white font-bold text-lg">
                              {selectedCompany.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-blue-900 text-lg">{selectedCompany.name}</p>
                        {selectedCompany.category && (
                          <p className="text-sm text-blue-700 font-medium">{selectedCompany.category}</p>
                        )}
                        <p className="text-sm text-blue-600">Strefa czasowa: {selectedCompany.timezone}</p>
                        <div className="mt-2">
                          <Link to={`/company/${selectedCompany.id}`} className="text-blue-600 hover:text-blue-800 underline">
                            Otwórz podgląd firmy
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="input-group">
                    <label htmlFor="res-email" className="input-label required">
                      Adres e-mail
                    </label>
                    <input
                      id="res-email"
                      type="email"
                      className={`input-brand-enhanced ${errors.email ? 'error' : ''} focus-brand`}
                      placeholder="np. jan.kowalski@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) {
                          setErrors(prev => ({ ...prev, email: undefined }));
                        }
                      }}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                    />
                    {errors.email && (
                      <p id="email-error" className="text-sm text-red-600 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{errors.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Date and Time Selection */}
                  <div className="selection-grid cols-2">
                    <div className="input-group">
                      <label htmlFor="res-date" className="input-label required">
                        Data wizyty
                      </label>
                      <input
                        id="res-date"
                        type="date"
                        className={`input-brand-enhanced ${errors.date ? 'error' : ''} focus-brand`}
                        value={date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                          setDate(e.target.value);
                          if (errors.date) {
                            setErrors(prev => ({ ...prev, date: undefined }));
                          }
                        }}
                        aria-invalid={!!errors.date}
                        aria-describedby={errors.date ? 'date-error' : undefined}
                      />
                      {errors.date && (
                        <p id="date-error" className="text-sm text-red-600 flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{errors.date}</span>
                        </p>
                      )}
                    </div>

                    <div className="input-group">
                      <label htmlFor="res-time" className="input-label required">
                        Godzina wizyty
                      </label>
                      <input
                        id="res-time"
                        type="time"
                        className={`input-brand-enhanced ${errors.time ? 'error' : ''} focus-brand`}
                        value={time}
                        onChange={(e) => {
                          setTime(e.target.value);
                          if (errors.time) {
                            setErrors(prev => ({ ...prev, time: undefined }));
                          }
                        }}
                        aria-invalid={!!errors.time}
                        aria-describedby={errors.time ? 'time-error' : undefined}
                      />
                      {errors.time && (
                        <p id="time-error" className="text-sm text-red-600 flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{errors.time}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="btn-brand-outline flex-1 focus-brand"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Wróć do wyboru firmy
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-brand-primary flex-1 disabled:opacity-60 disabled:cursor-not-allowed focus-brand"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="brand-spinner"></div>
                          <span>Tworzenie rezerwacji...</span>
                        </div>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Potwierdź rezerwację
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Error/Success Message */}
              {message && step < 3 && (
                <div className={hasError ? 'status-error' : 'status-success'}>
                  <div className="flex items-center space-x-2">
                    {hasError ? (
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    <p className="font-medium">{message}</p>
                  </div>
                </div>
              )}
            </form>
          </div>
        ) : (
          /* Step 3: Success State */
          <div className="card-brand max-w-2xl mx-auto">
            <div className="success-container">
              <div className="success-icon">
                <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              
              <div>
                <h2 className="success-title">Rezerwacja potwierdzona!</h2>
                <p className="success-message">{message}</p>
              </div>

              <div className="success-details">
                <h3 className="success-details-title">Szczegóły rezerwacji</h3>
                <div className="success-details-grid">
                  <div className="success-detail-item">
                    <span className="success-detail-label">Firma</span>
                    <span className="success-detail-value">{selectedCompany?.name}</span>
                  </div>
                  <div className="success-detail-item">
                    <span className="success-detail-label">Data</span>
                    <span className="success-detail-value">
                      {new Date(date).toLocaleDateString('pl-PL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="success-detail-item">
                    <span className="success-detail-label">Godzina</span>
                    <span className="success-detail-value">{time}</span>
                  </div>
                  <div className="success-detail-item">
                    <span className="success-detail-label">E-mail</span>
                    <span className="success-detail-value">{email}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    setStep(1);
                    setEmail('');
                    setDate('');
                    setTime('');
                    setCompanyId(null);
                    setMessage('');
                    setErrors({});
                  }}
                  className="btn-brand-primary focus-brand"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Zarezerwuj kolejną wizytę
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="btn-brand-outline focus-brand"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0L3 9.414a1 1 0 010-1.414L8.293 2.707a1 1 0 011.414 1.414L5.414 8H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Powrót do strony głównej
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
