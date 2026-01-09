import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_URL } from '../lib/api';

interface Company {
  id: number;
  name: string;
  timezone: string;
  logoPath?: string;
  category?: string;
  description?: string;
  address?: string;
  phone?: string;
  contactEmail?: string;
  website?: string;
}

interface WorkingHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface Worker {
  id: number;
  id: number;
  nickname?: string;
  avatarUrl?: string;
  email: string;
  isTrainee: boolean;
  canServe: boolean;
}

const DAY_NAMES_SHORT = ['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];

// Premium animated loading skeleton
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4 relative overflow-hidden">
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="glow-orb glow-orb-blue w-96 h-96 top-0 left-0 morph-shape"></div>
      <div className="glow-orb glow-orb-purple w-96 h-96 bottom-0 right-0 morph-shape"></div>
    </div>
    <div className="max-w-5xl mx-auto space-y-6 relative z-10">
      {/* Header skeleton */}
      <div className="glass-premium rounded-2xl shadow-xl p-8 animate-pulse">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-28 h-28 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-gray-200 rounded-lg w-2/3"></div>
            <div className="h-6 bg-gray-200 rounded-full w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-premium rounded-2xl shadow-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>)}
          </div>
        </div>
        <div className="glass-premium rounded-2xl shadow-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="flex gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 w-14 bg-gray-200 rounded-full"></div>)}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function CompanyPreviewPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVisible, setIsVisible] = useState(false);

  const idNum = Number(companyId);

  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);
    Promise.all([
      api<{ company: Company }>(`/companies/${companyId}`).then((x) => setCompany(x.company)),
      api<{ workingHours: any[] }>(`/working-hours/company/${companyId}`).then((x) => {
        const mapped = (x.workingHours || []).map(wh => ({
          dayOfWeek: wh.dayOfWeek,
          openTime: wh.startTime,
          closeTime: wh.endTime,
          isClosed: !wh.isActive
        }));
        setWorkingHours(mapped);
      }).catch(() => setWorkingHours([])),
      api<{ workers: any[] }>(`/companies/${companyId}/workers`).then((x) => {
        const mapped = (x.workers || []).map(w => ({
          id: w.id,
          id: w.id,
          nickname: w.nickname,
          avatarUrl: w.avatarUrl,
          email: w.email,
          isTrainee: w.isTrainee || false,
          canServe: w.canServe !== false
        }));
        setWorkers(mapped);
      }).catch(() => setWorkers([])),
    ]).then(() => {
      setIsLoading(false);
      // Trigger animations after a small delay
      setTimeout(() => setIsVisible(true), 100);
    });
  }, [companyId]);

  const sortedHours = [...workingHours].sort((a, b) => {
    const orderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const orderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    return orderA - orderB;
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Nie znaleziono firmy</h2>
          <p className="text-gray-600 mb-6">Przepraszamy, nie udało się znaleźć szukanej firmy.</p>
          <button onClick={() => navigate('/')} className="btn-brand-primary">
            Wróć na stronę główną
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">

        {/* Hero Header Card */}
        <div
          className={`glass-premium rounded-2xl overflow-hidden transition-all duration-700 animate-slide-in-up ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          {/* Gradient top bar */}
          <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

          <div className="p-8">
            <div className="flex flex-col md:flex-row items-start gap-8">
              {/* Logo with hover effect */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-white shadow-xl transform group-hover:scale-105 transition-transform duration-300">
                  {company.logoPath ? (
                    <img src={`${API_URL}${company.logoPath}`} alt={`Logo ${company.name}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-white font-bold text-4xl drop-shadow-lg">{company.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight animate-typing overflow-visible border-none">
                  <span className="text-gradient-animated">{company.name}</span>
                </h1>

                {company.category && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium rounded-full shadow-lg shadow-blue-500/25">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {company.category}
                  </span>
                )}

                {company.description && (
                  <p className="text-gray-600 mt-4 text-lg leading-relaxed">{company.description}</p>
                )}

                {/* Contact info with icons */}
                <div className="flex flex-wrap gap-4 mt-6">
                  {company.address && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">{company.address}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">{company.phone}</span>
                    </div>
                  )}
                  {company.contactEmail && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">{company.contactEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two column layout for Hours and Team */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Working Hours Card */}
          {sortedHours.length > 0 && (
            <div
              className={`glass-premium rounded-2xl p-6 transition-all duration-700 delay-100 hover-rise animate-slide-in-left ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Godziny otwarcia
              </h2>
              <div className="space-y-2">
                {sortedHours.map((wh, index) => (
                  <div
                    key={wh.dayOfWeek}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] ${wh.isClosed
                      ? 'bg-gray-50 hover:bg-gray-100'
                      : 'bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100'
                      }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <span className="font-semibold text-gray-800">{DAY_NAMES_SHORT[wh.dayOfWeek]}</span>
                    {wh.isClosed ? (
                      <span className="px-3 py-1 bg-red-100 text-red-600 text-sm font-medium rounded-full">Zamknięte</span>
                    ) : (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">
                        {wh.openTime?.slice(0, 5)} - {wh.closeTime?.slice(0, 5)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Card */}
          {workers.length > 0 && (
            <div
              className={`glass-premium rounded-2xl p-6 transition-all duration-700 delay-200 hover-rise animate-slide-in-right ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                Nasi specjaliści
              </h2>
              <div className="space-y-3">
                {workers.filter(w => w.canServe !== false).map((worker, index) => (
                  <div
                    key={worker.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-all duration-300 hover:scale-[1.02] hover:shadow-md group"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="relative">
                      {worker.avatarUrl ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                          <img src={`${API_URL}${worker.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                          <span className="text-white font-bold text-lg">{(worker.nickname || worker.email).charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      {/* Online indicator */}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-sm"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{worker.nickname || worker.email}</div>
                      {worker.nickname && <div className="text-xs text-gray-400 truncate">{worker.email}</div>}
                      <div className="text-sm text-gray-500">Specjalista</div>
                    </div>
                    {worker.isTrainee && (
                      <span className="px-3 py-1 bg-gradient-to-r from-orange-400 to-amber-500 text-white text-xs font-bold rounded-full shadow-lg shadow-orange-500/25">
                        Stażysta
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className={`text-center py-8 transition-all duration-700 delay-300 animate-slide-in-up ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="glass-premium rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Umów się bez czekania</h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Sprawdź wolne terminy i zarezerwuj swój czas w mniej niż minutę.
              </p>
              <button
                onClick={() => navigate('/reserve', { state: { companyId: idNum } })}
                className="btn-glow text-lg shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:scale-105 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span>Przejdź do rezerwacji</span>
                  <svg className="w-5 h-5 animate-bounce-horizontal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom animation styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
