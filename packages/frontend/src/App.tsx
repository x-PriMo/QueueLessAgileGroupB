import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';
import AppRouter from './router';
import Logo from './components/Logo';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UiPreferencesProvider } from './contexts/UiPreferencesContext';
import UiPreferencesControls from './components/UiPreferencesControls';

function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Błąd podczas wylogowania:', error);
    }
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'PLATFORM_ADMIN':
        return '/dashboard/admin';
      case 'OWNER':
        return '/dashboard/owner';
      case 'WORKER':
        return '/dashboard/worker';
      case 'USER':
      default:
        return '/dashboard/user';
    }
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="group">
            <Logo size="lg" showBackground={false} />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/') 
                  ? 'bg-blue-50 text-blue-700 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Strona główna
            </Link>
            
            {user && (
              <>
                <Link
                  to="/reserve"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive('/reserve') 
                      ? 'bg-blue-50 text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Rezerwacja
                </Link>
                
                <Link
                  to={getDashboardPath()}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    location.pathname.startsWith('/dashboard') 
                      ? 'bg-blue-50 text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Panel
                </Link>
              </>
            )}
            
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  Witaj, {user.email}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {user.role === 'PLATFORM_ADMIN' ? 'Admin' : 
                   user.role === 'OWNER' ? 'Właściciel' :
                   user.role === 'WORKER' ? 'Pracownik' : 'Użytkownik'}
                </span>
                <UiPreferencesControls />
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
                >
                  Wyloguj
                </button>
              </div>
            ) : (
              <>
                <UiPreferencesControls />
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive('/login') 
                      ? 'bg-blue-50 text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Logowanie
                </Link>
                <Link
                  to="/register"
                  className="btn-brand text-sm"
                >
                  Rejestracja
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UiPreferencesProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main>
              <AppRouter />
            </main>
            
            {/* Footer */}
            <footer className="bg-gray-900 text-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid md:grid-cols-4 gap-8">
                  <div className="col-span-2">
                    <div className="mb-4">
                      <Logo size="md" />
                    </div>
                    <p className="text-gray-400 mb-4 max-w-md">
                      Nowoczesna platforma do zarządzania rezerwacjami i kolejkami. 
                      Zwiększ efektywność obsługi klientów już dziś.
                    </p>
                    <div className="flex space-x-4">
                      <a href="#" className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                        </svg>
                      </a>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </a>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Platforma</h3>
                    <ul className="space-y-2 text-gray-400">
                      <li><Link to="/reserve" className="hover:text-white transition-colors">Rezerwacje</Link></li>
                      <li><a href="#" className="hover:text-white transition-colors">Kolejki</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">Analityka</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">Integracje</a></li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Wsparcie</h3>
                    <ul className="space-y-2 text-gray-400">
                      <li><a href="#" className="hover:text-white transition-colors">Centrum pomocy</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">Kontakt</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">Status systemu</a></li>
                      <li><a href="#" className="hover:text-white transition-colors">Dokumentacja API</a></li>
                    </ul>
                  </div>
                </div>
                
                <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                  <p className="text-gray-400 text-sm">
                    © 2024 QueueLess. Wszystkie prawa zastrzeżone.
                  </p>
                  <div className="flex space-x-6 mt-4 md:mt-0">
                    <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Polityka prywatności</a>
                    <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Regulamin</a>
                    <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookies</a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Router>
      </UiPreferencesProvider>
    </AuthProvider>
  );
}
