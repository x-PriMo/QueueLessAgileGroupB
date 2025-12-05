import React from 'react';
import { api, API_URL } from '../lib/api';

interface Company {
    id: number;
    name: string;
    category?: string;
    description?: string;
    address?: string;
    phone?: string;
    contactEmail?: string;
    website?: string;
    logoPath?: string;
}

interface CompanyInfoModalProps {
    companyId: number;
    onClose: () => void;
}

export default function CompanyInfoModal({ companyId, onClose }: CompanyInfoModalProps) {
    const [company, setCompany] = React.useState<Company | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        const loadCompany = async () => {
            try {
                setLoading(true);
                const response = await api<{ company: Company }>(`/companies/${companyId}`);
                setCompany(response.company);
            } catch (err) {
                setError('Nie udało się załadować informacji o firmie');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadCompany();
    }, [companyId]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-white">Informacje o firmie</h2>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                            aria-label="Zamknij"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading && (
                        <div className="text-center py-12">
                            <div className="brand-spinner mx-auto mb-4"></div>
                            <p className="text-gray-500">Ładowanie...</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    {company && !loading && (
                        <div className="space-y-6">
                            {/* Logo i nazwa */}
                            <div className="text-center pb-6 border-b border-gray-200">
                                {company.logoPath && (
                                    <img
                                        src={`${API_URL}${company.logoPath}`}
                                        alt={company.name}
                                        className="w-24 h-24 mx-auto mb-4 rounded-full object-cover shadow-lg"
                                    />
                                )}
                                <h3 className="text-3xl font-bold text-gray-900 mb-2">{company.name}</h3>
                                {company.category && (
                                    <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                        {company.category}
                                    </span>
                                )}
                            </div>

                            {/* Opis */}
                            {company.description && (
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        O firmie
                                    </h4>
                                    <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                                        {company.description}
                                    </p>
                                </div>
                            )}

                            {/* Dane kontaktowe */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Kontakt
                                </h4>
                                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                                    {company.address && (
                                        <div className="flex items-start gap-3">
                                            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <div>
                                                <div className="text-xs text-gray-500 font-medium">Adres</div>
                                                <div className="text-gray-900">{company.address}</div>
                                            </div>
                                        </div>
                                    )}

                                    {company.phone && (
                                        <div className="flex items-start gap-3">
                                            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <div>
                                                <div className="text-xs text-gray-500 font-medium">Telefon</div>
                                                <a href={`tel:${company.phone}`} className="text-blue-600 hover:underline">{company.phone}</a>
                                            </div>
                                        </div>
                                    )}

                                    {company.contactEmail && (
                                        <div className="flex items-start gap-3">
                                            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                            </svg>
                                            <div>
                                                <div className="text-xs text-gray-500 font-medium">Email</div>
                                                <a href={`mailto:${company.contactEmail}`} className="text-blue-600 hover:underline">{company.contactEmail}</a>
                                            </div>
                                        </div>
                                    )}

                                    {company.website && (
                                        <div className="flex items-start gap-3">
                                            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                            </svg>
                                            <div>
                                                <div className="text-xs text-gray-500 font-medium">Strona WWW</div>
                                                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                    {company.website}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Informacja o rezerwacji */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-900">
                                    <span className="font-semibold">Wskazówka:</span> Zamknij to okno aby kontynuować rezerwację.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="btn-brand w-full"
                    >
                        Zamknij
                    </button>
                </div>
            </div>
        </div>
    );
}
