import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Brak uprawnień</h2>
          <p className="text-gray-600">Nie masz uprawnień do przeglądania tej strony</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center space-y-4">
            <p className="text-gray-700">
              {user ? (
                <>
                  Jesteś zalogowany jako <strong>{user.email}</strong> z rolą <strong>{user.role}</strong>.
                  <br />
                  Ta strona wymaga innych uprawnień.
                </>
              ) : (
                'Musisz się zalogować, aby uzyskać dostęp do tej strony.'
              )}
            </p>

            <div className="flex flex-col space-y-3">
              {user ? (
                <Link
                  to="/"
                  className="btn-brand-primary"
                >
                  Wróć do strony głównej
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="btn-brand-primary"
                >
                  Zaloguj się
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
