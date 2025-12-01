import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, API_URL, Service, ServiceSlot } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import StepProgress from './StepProgress';
import { DateTime, Info } from 'luxon';

// --- Icons ---
const CheckIcon = ({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M5 13l4 4L19 7" />
    </svg>
);

const ChevronLeftIcon = ({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = ({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M9 5l7 7-7 7" />
    </svg>
);

const UserGroupIcon = ({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const UserIcon = ({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const PaperPlaneIcon = ({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
);

// --- Types ---

interface Company {
    id: number;
    name: string;
    logoPath?: string;
    timezone: string;
    category?: string;
    description?: string;
}

interface Worker {
    id: number;
    name: string;
    email: string;
    role: string;
    isTrainee: boolean;
}

interface WizardState {
    step: number;
    company: Company | null;
    service: Service | null;
    date: string;
    workerId: number | 'any' | null;
    slot: { startTime: string; endTime: string; workerId: number } | null;
    email: string;
}

// --- Helper Components ---

function Confetti() {
    return (
        <div className="confetti absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(30)].map((_, i) => (
                <div
                    key={i}
                    className="confetti-piece absolute w-2 h-2 bg-yellow-400 rounded-full animate-confetti"
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 0.5}s`,
                        animationDuration: `${2 + Math.random() * 2}s`
                    }}
                />
            ))}
        </div>
    );
}

export default function ReservationWizard() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // State
    const [state, setState] = useState<WizardState>({
        step: 1,
        company: null,
        service: null,
        date: '',
        workerId: null,
        slot: null,
        email: ''
    });

    // Data Loading State
    const [companies, setCompanies] = useState<Company[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [slots, setSlots] = useState<ServiceSlot[]>([]);

    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(DateTime.now());

    // --- Effects ---

    // Load categories on mount
    useEffect(() => {
        api<{ categories: { category: string; count: number }[] }>('/companies/categories/list')
            .then(res => setCategories(res.categories || []))
            .catch(console.error);
    }, []);

    // Pre-fill email if user is logged in
    useEffect(() => {
        console.log('[ReservationWizard] User state:', user);
        if (user?.email) {
            console.log('[ReservationWizard] Pre-filling email with:', user.email);
            setState(prev => ({ ...prev, email: user.email }));
        }
    }, [user]);

    // Load companies when search/category changes
    useEffect(() => {
        if (state.step === 1) {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedCategory) params.set('category', selectedCategory);
            if (searchQuery) params.set('q', searchQuery);

            api<{ companies: Company[] }>(`/companies?${params.toString()}`)
                .then(res => setCompanies(res.companies || []))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [selectedCategory, searchQuery, state.step]);

    // Load services when company is selected
    useEffect(() => {
        if (state.company) {
            setLoading(true);
            api<{ services: Service[] }>(`/services/companies/${state.company.id}/services`)
                .then(res => setServices(res.services || []))
                .catch(console.error)
                .finally(() => setLoading(false));

            // Also load workers
            api<{ workers: Worker[] }>(`/companies/${state.company.id}/workers`)
                .then(res => {
                    // Map email to name if name is missing (backend returns email)
                    const mappedWorkers = (res.workers || []).map(w => ({
                        ...w,
                        name: w.name || w.email // Fallback to email if name is empty
                    }));
                    setWorkers(mappedWorkers);
                })
                .catch(console.error);
        }
    }, [state.company]);

    // Load slots when date/worker changes (Step 5)
    useEffect(() => {
        if (state.step === 5 && state.company && state.service && state.date) {
            setLoading(true);
            const workerParam = state.workerId === 'any' ? 'any' : state.workerId;
            api<{ slots: ServiceSlot[] }>(`/services/companies/${state.company.id}/services/${state.service.id}/slots?date=${state.date}&workerId=${workerParam}`)
                .then(res => setSlots(res.slots || []))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [state.step, state.date, state.workerId]);

    // Pre-fill from navigation state
    useEffect(() => {
        const navState = location.state as { companyId?: number } | null;
        if (navState?.companyId && !state.company) {
            api<{ company: Company }>(`/companies/${navState.companyId}`)
                .then(res => {
                    setState(prev => ({ ...prev, company: res.company, step: 2 }));
                })
                .catch(console.error);
        }
    }, [location.state]);

    // --- Handlers ---

    const handleCompanySelect = (company: Company) => {
        setState(prev => ({ ...prev, company, step: 2 }));
    };

    const handleServiceSelect = (service: Service) => {
        setState(prev => ({ ...prev, service, step: 3 }));
    };

    const handleDateSelect = (dateStr: string) => {
        setState(prev => ({ ...prev, date: dateStr, step: 4 }));
    };

    const handleWorkerSelect = (workerId: number | 'any') => {
        setState(prev => ({ ...prev, workerId, step: 5 }));
    };

    const handleSlotSelect = (slot: ServiceSlot) => {
        // If 'any' was selected, pick the first available worker from the slot
        const workerId = state.workerId === 'any'
            ? slot.availableWorkers[0].id
            : (typeof state.workerId === 'number' ? state.workerId : slot.availableWorkers[0].id);

        setState(prev => ({
            ...prev,
            slot: {
                startTime: slot.startTime,
                endTime: slot.endTime,
                workerId
            },
            step: 6
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!state.company || !state.service || !state.slot || !state.email) return;

        setSubmissionStatus('submitting');
        try {
            await api('/reservations', {
                method: 'POST',
                body: JSON.stringify({
                    companyId: state.company.id,
                    serviceId: state.service.id,
                    workerId: state.slot.workerId,
                    date: state.date,
                    startTime: state.slot.startTime,
                    email: state.email
                })
            });
            setSubmissionStatus('success');
        } catch (err) {
            setSubmissionStatus('error');
            setErrorMessage(err instanceof Error ? err.message : 'Wystąpił błąd');
        }
    };

    const resetFlow = () => {
        setState({
            step: 1,
            company: null,
            service: null,
            date: '',
            workerId: null,
            slot: null,
            email: ''
        });
        setSubmissionStatus('idle');
    };

    const copyConfirmationLink = () => {
        const url = `${window.location.origin}/reservation/confirm?email=${encodeURIComponent(state.email)}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Link skopiowany do schowka!');
        });
    };

    // --- Render Steps ---

    const renderStep1_Company = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Wybierz firmę</h2>
                <p className="text-gray-600 mt-2">Znajdź usługodawcę, którego szukasz</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Szukaj firmy..."
                        className="input-brand pl-10 w-full"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <select
                    className="input-brand md:w-1/3"
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                >
                    <option value="">Wszystkie kategorie</option>
                    {categories.map(c => (
                        <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4">
                    {companies.map(company => (
                        <div
                            key={company.id}
                            onClick={() => handleCompanySelect(company)}
                            className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
                        >
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xl font-bold text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                {company.logoPath ? (
                                    <img src={`${API_URL}${company.logoPath}`} alt={company.name} className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    company.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition-colors">{company.name}</h3>
                                <p className="text-sm text-gray-500">{company.category || 'Usługi ogólne'}</p>
                            </div>
                            <div className="text-gray-300 group-hover:text-blue-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    ))}
                    {companies.length === 0 && (
                        <div className="text-center py-12 text-gray-500">Nie znaleziono firm spełniających kryteria.</div>
                    )}
                </div>
            )}
        </div>
    );

    const renderStep2_Service = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Wybierz usługę</h2>
                <p className="text-gray-600 mt-2">Co możemy dla Ciebie zrobić?</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="brand-spinner" /></div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {services.map(service => (
                        <div
                            key={service.id}
                            onClick={() => handleServiceSelect(service)}
                            className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700">{service.name}</h3>
                                <span className="font-bold text-blue-600">{service.price} zł</span>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">{service.description || 'Brak opisu'}</p>
                            <div className="flex items-center text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full w-fit">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {service.durationMinutes} min
                            </div>
                        </div>
                    ))}
                    {services.length === 0 && (
                        <div className="col-span-2 text-center py-12 text-gray-500">Ta firma nie ma jeszcze zdefiniowanych usług.</div>
                    )}
                </div>
            )}
            <button onClick={() => setState(prev => ({ ...prev, step: 1 }))} className="mt-8 text-gray-500 hover:text-gray-800 text-sm flex items-center justify-center w-full">
                ← Wróć do wyboru firmy
            </button>
        </div>
    );

    const renderStep3_Date = () => {
        const startOfMonth = currentMonth.startOf('month');
        const endOfMonth = currentMonth.endOf('month');
        const startOfWeek = startOfMonth.startOf('week');
        const endOfWeek = endOfMonth.endOf('week');

        const days = [];
        let day = startOfWeek;
        while (day <= endOfWeek) {
            days.push(day);
            day = day.plus({ days: 1 });
        }

        const weekDays = Info.weekdays('short', { locale: 'pl' });

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Wybierz datę</h2>
                    <p className="text-gray-600 mt-2">Kiedy chcesz nas odwiedzić?</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-md mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setCurrentMonth(prev => prev.minus({ months: 1 }))} className="p-2 hover:bg-gray-100 rounded-full">
                            <ChevronLeftIcon />
                        </button>
                        <h3 className="text-lg font-bold text-gray-900 capitalize">
                            {currentMonth.toFormat('MMMM yyyy', { locale: 'pl' })}
                        </h3>
                        <button onClick={() => setCurrentMonth(prev => prev.plus({ months: 1 }))} className="p-2 hover:bg-gray-100 rounded-full">
                            <ChevronRightIcon />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                        {weekDays.map(d => (
                            <div key={d} className="text-xs font-medium text-gray-400 uppercase py-2">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {days.map(d => {
                            const isCurrentMonth = d.hasSame(currentMonth, 'month');
                            const isToday = d.hasSame(DateTime.now(), 'day');
                            const isPast = d < DateTime.now().startOf('day');
                            const isSelected = state.date === d.toISODate();

                            return (
                                <button
                                    key={d.toISODate()}
                                    disabled={isPast}
                                    onClick={() => handleDateSelect(d.toISODate())}
                                    className={`
                                        h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm transition-all
                                        ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                                        ${isPast ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-50 hover:text-blue-600'}
                                        ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' : ''}
                                        ${isToday && !isSelected ? 'border border-blue-600 text-blue-600 font-bold' : ''}
                                    `}
                                >
                                    {d.day}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button onClick={() => setState(prev => ({ ...prev, step: 2 }))} className="mt-8 text-gray-500 hover:text-gray-800 text-sm flex items-center justify-center w-full">
                    ← Wróć do wyboru usługi
                </button>
            </div>
        );
    };

    const renderStep4_Worker = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Wybierz specjalistę</h2>
                <p className="text-gray-600 mt-2">Kto ma wykonać usługę?</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {/* Opcja: Dowolny pracownik */}
                <div
                    onClick={() => handleWorkerSelect('any')}
                    className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <UserGroupIcon />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700">Dowolny pracownik</h3>
                        <p className="text-sm text-gray-500">Najszybszy dostępny termin</p>
                    </div>
                </div>

                {/* Lista pracowników */}
                {workers.map(worker => (
                    <div
                        key={worker.id}
                        onClick={() => handleWorkerSelect(worker.id)}
                        className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex items-center gap-4"
                    >
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <UserIcon />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700">{worker.name}</h3>
                            <p className="text-sm text-gray-500">{worker.role === 'OWNER' ? 'Właściciel' : 'Specjalista'}</p>
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={() => setState(prev => ({ ...prev, step: 3 }))} className="mt-8 text-gray-500 hover:text-gray-800 text-sm flex items-center justify-center w-full">
                ← Wróć do wyboru daty
            </button>
        </div>
    );

    const renderStep5_Time = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Wybierz godzinę</h2>
                <p className="text-gray-600 mt-2">
                    {state.date} • {state.workerId === 'any' ? 'Dowolny pracownik' : workers.find(w => w.id === state.workerId)?.name}
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="brand-spinner" /></div>
            ) : (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-3xl mx-auto">
                    {slots.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {slots.map((slot, idx) => (
                                <button
                                    key={`${slot.startTime}-${idx}`}
                                    onClick={() => handleSlotSelect(slot)}
                                    className="px-4 py-3 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm hover:shadow-md"
                                >
                                    {slot.startTime}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <p>Brak wolnych terminów w tym dniu.</p>
                            <button onClick={() => setState(prev => ({ ...prev, step: 3 }))} className="text-blue-600 hover:underline mt-2">
                                Wybierz inną datę
                            </button>
                        </div>
                    )}
                </div>
            )}

            <button onClick={() => setState(prev => ({ ...prev, step: 4 }))} className="mt-8 text-gray-500 hover:text-gray-800 text-sm flex items-center justify-center w-full">
                ← Wróć do wyboru pracownika
            </button>
        </div>
    );

    const renderStep6_Confirm = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Potwierdzenie</h2>
                <p className="text-gray-600 mt-2">Ostatni krok do rezerwacji</p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-lg max-w-lg mx-auto">
                <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">
                            {state.company?.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">{state.company?.name}</h3>
                            <p className="text-sm text-gray-500">{state.company?.category}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500 block mb-1">Usługa</span>
                            <span className="font-medium text-gray-900">{state.service?.name}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block mb-1">Cena</span>
                            <span className="font-medium text-gray-900">{state.service?.price} zł</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block mb-1">Data</span>
                            <span className="font-medium text-gray-900">{state.date}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block mb-1">Godzina</span>
                            <span className="font-medium text-gray-900">{state.slot?.startTime}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-gray-500 block mb-1">Specjalista</span>
                            <span className="font-medium text-gray-900">
                                {workers.find(w => w.id === state.slot?.workerId)?.name || 'Nieznany'}
                            </span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Twój adres e-mail</label>
                        <input
                            type="email"
                            required
                            className={`input-brand w-full ${user ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            placeholder={user ? user.email : "jan@kowalski.pl"}
                            value={state.email}
                            onChange={e => setState(prev => ({ ...prev, email: e.target.value }))}
                            disabled={!!user}
                            readOnly={!!user}
                            title={user ? "Zalogowany jako " + user.email : ""}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {user ? "Email zostanie wysłany na Twój zarejestrowany adres" : "Wyślemy potwierdzenie na ten adres."}
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={submissionStatus === 'submitting'}
                        className="btn-brand-primary w-full py-3 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                    >
                        {submissionStatus === 'submitting' ? 'Rezerwowanie...' : 'Potwierdzam rezerwację'}
                    </button>
                </form>
                {submissionStatus === 'error' && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                        {errorMessage}
                    </div>
                )}
            </div>
            <button onClick={() => setState(prev => ({ ...prev, step: 5 }))} className="mt-4 text-gray-500 hover:text-gray-800 text-sm flex items-center justify-center w-full">
                ← Zmień godzinę
            </button>
        </div>
    );

    const renderSuccess = () => (
        <div className="text-center py-12 animate-fade-in relative">
            <Confetti />
            <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center animate-fly-paper-plane">
                    <PaperPlaneIcon className="w-12 h-12 transform -rotate-45 translate-x-1 translate-y-1" />
                </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Rezerwacja przyjęta!</h2>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
                Dziękujemy za rezerwację. Potwierdzenie zostało wysłane na adres <strong>{state.email}</strong>.
            </p>
            <div className="flex justify-center gap-4">
                <button onClick={resetFlow} className="btn-brand-primary">
                    Zarezerwuj kolejną wizytę
                </button>
                <button onClick={copyConfirmationLink} className="btn-brand-outline flex items-center">
                    Skopiuj link potwierdzenia
                </button>
                <button onClick={() => navigate('/')} className="btn-brand-outline">
                    Wróć na stronę główną
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <style>{`
                @keyframes fly-paper-plane {
                    0% { transform: translate(-50px, 50px) scale(0.5); opacity: 0; }
                    20% { transform: translate(0, 0) scale(1.1); opacity: 1; }
                    40% { transform: translate(0, 0) scale(1); opacity: 1; }
                    100% { transform: translate(100px, -100px) scale(0.5); opacity: 0; }
                }
                .animate-fly-paper-plane {
                    animation: fly-paper-plane 2s ease-in-out infinite;
                }
            `}</style>
            <div className="w-full max-w-4xl bg-white/80 backdrop-blur-lg rounded-xl shadow-2xl p-6 sm:p-8">
                {submissionStatus === 'success' ? (
                    renderSuccess()
                ) : (
                    <>
                        <StepProgress currentStep={state.step} totalSteps={6} />
                        <div className="mt-8">
                            {state.step === 1 && renderStep1_Company()}
                            {state.step === 2 && renderStep2_Service()}
                            {state.step === 3 && renderStep3_Date()}
                            {state.step === 4 && renderStep4_Worker()}
                            {state.step === 5 && renderStep5_Time()}
                            {state.step === 6 && renderStep6_Confirm()}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
