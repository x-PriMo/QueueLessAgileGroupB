import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center">
            <div className="mb-8">
              <span className="inline-block bg-blue-500/20 text-blue-100 px-4 py-2 rounded-full text-sm font-medium mb-4">
                🚀 Platforma nowej generacji
              </span>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
              QueueLess
              <span className="block text-4xl md:text-5xl text-blue-300 font-light mt-2">
                Koniec z kolejkami
              </span>
            </h1>
            <p className="text-xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed">
              Nowoczesna platforma do zarządzania rezerwacjami i kolejkami dla firm każdej wielkości. 
              Zwiększ efektywność obsługi klientów i popraw ich doświadczenia dzięki inteligentnym rozwiązaniom.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link
                to="/reserve"
                className="btn-brand-primary"
              >
                <span className="flex items-center justify-center gap-2">
                  Zarezerwuj termin
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </Link>
              <Link
                to="/company-request"
                className="btn-brand-outline"
              >
                Dołącz jako firma
              </Link>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">10,000+</div>
                <div className="text-blue-200">Zadowolonych klientów</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">500+</div>
                <div className="text-blue-200">Firm korzysta</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">95%</div>
                <div className="text-blue-200">Redukcja czasu oczekiwania</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Jak to działa?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Prosty proces w trzech krokach, który zmieni sposób obsługi Twoich klientów
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="brand-logo-lg mx-auto mb-4 shadow-xl group-hover:shadow-2xl transition-shadow">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Wybierz firmę</h3>
              <p className="text-gray-600 leading-relaxed">
                Przeglądaj listę dostępnych firm i usług. Sprawdź godziny otwarcia, 
                dostępne terminy i opinie innych klientów.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:shadow-2xl transition-shadow">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Zarezerwuj termin</h3>
              <p className="text-gray-600 leading-relaxed">
                Wybierz dogodny dla Ciebie termin z kalendarza. System automatycznie 
                potwierdzi rezerwację i wyśle przypomnienie.
              </p>
            </div>
            
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:shadow-2xl transition-shadow">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Przyjdź o czasie</h3>
              <p className="text-gray-600 leading-relaxed">
                Otrzymaj powiadomienie przed wizytą. Śledź status kolejki w czasie rzeczywistym 
                i ciesz się szybką obsługą bez czekania.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Dlaczego QueueLess?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Zaawansowane funkcje, które wyróżniają nas na rynku
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-time tracking</h3>
              <p className="text-gray-600">Śledź status swojej kolejki na żywo i otrzymuj aktualizacje o przewidywanym czasie obsługi.</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-2xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 7H4l5-5v5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Inteligentne algorytmy</h3>
              <p className="text-gray-600">Zaawansowane algorytmy optymalizują kolejki i minimalizują czas oczekiwania dla wszystkich.</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Łatwa integracja</h3>
              <p className="text-gray-600">Szybkie wdrożenie w każdej firmie bez skomplikowanych konfiguracji technicznych.</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-2xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Aplikacja mobilna</h3>
              <p className="text-gray-600">Pełna funkcjonalność dostępna na urządzeniach mobilnych - rezerwuj w każdym miejscu.</p>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-2xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-red-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Analityka biznesowa</h3>
              <p className="text-gray-600">Szczegółowe raporty i statystyki pomagają firmom optymalizować procesy obsługi.</p>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-8 rounded-2xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-indigo-500 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Zarządzanie zespołem</h3>
              <p className="text-gray-600">Kompleksowe narzędzia do zarządzania pracownikami, zmianami i harmonogramami.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Co mówią nasi klienci</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Poznaj opinie firm, które już korzystają z QueueLess
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-8 rounded-2xl">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">MK</span>
                </div>
                <div>
                  <div className="text-white font-semibold">Maria Kowalska</div>
                  <div className="text-gray-400 text-sm">Właścicielka salonu fryzjerskiego</div>
                </div>
              </div>
              <p className="text-gray-300 mb-4">
                "QueueLess całkowicie zmienił sposób działania mojego salonu. Klienci są zadowoleni, 
                a ja mam pełną kontrolę nad harmonogramem."
              </p>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-800 p-8 rounded-2xl">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">PW</span>
                </div>
                <div>
                  <div className="text-white font-semibold">Piotr Wiśniewski</div>
                  <div className="text-gray-400 text-sm">Dyrektor kliniki medycznej</div>
                </div>
              </div>
              <p className="text-gray-300 mb-4">
                "Redukcja czasu oczekiwania o 80% i zadowoleni pacjenci. 
                QueueLess to najlepsza inwestycja, jaką zrobiliśmy w tym roku."
              </p>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-800 p-8 rounded-2xl">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">AN</span>
                </div>
                <div>
                  <div className="text-white font-semibold">Anna Nowak</div>
                  <div className="text-gray-400 text-sm">Manager restauracji</div>
                </div>
              </div>
              <p className="text-gray-300 mb-4">
                "Nasi goście uwielbiają możliwość rezerwacji stolików online. 
                Znacznie poprawiliśmy organizację i zwiększyliśmy przychody."
              </p>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Gotowy na rewolucję w obsłudze klientów?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Dołącz do setek firm, które już korzystają z QueueLess i zobacz różnicę już dziś.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/register"
              className="bg-white hover:bg-gray-100 text-blue-600 px-10 py-5 rounded-xl text-lg font-bold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              Rozpocznij za darmo
            </Link>
            <Link
              to="/reserve"
              className="bg-transparent hover:bg-white/10 text-white border-2 border-white px-10 py-5 rounded-xl text-lg font-bold transition-all duration-300"
            >
              Sprawdź demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
