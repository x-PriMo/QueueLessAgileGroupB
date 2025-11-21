import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirectTo = params.get('redirect');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email) {
      newErrors.email = 'E-mail jest wymagany';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Nieprawidłowy format e-mail';
    }

    if (!password) {
      newErrors.password = 'Hasło jest wymagane';
    } else if (password.length < 6) {
      newErrors.password = 'Hasło musi mieć co najmniej 6 znaków';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(email, password);
      setMessage(`Witaj ponownie, ${user.email}!`);
      setHasError(false);
      
      // Przekierowanie po zalogowaniu: jeśli podano docelowy adres, wróć tam
      if (redirectTo) {
        navigate(redirectTo);
      } else {
        // W przeciwnym razie przejdź do dashboardu zależnie od roli
        switch (user.role) {
          case 'PLATFORM_ADMIN':
            navigate('/dashboard/admin');
            break;
          case 'OWNER':
            navigate('/dashboard/owner');
            break;
          case 'WORKER':
            navigate('/dashboard/worker');
            break;
          case 'USER':
          default:
            navigate('/dashboard/user');
            break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wystąpił błąd podczas logowania';
      setMessage(msg);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Zaloguj się</h2>
          <p className="text-gray-600">Witaj ponownie! Zaloguj się do swojego konta</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Adres e-mail
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`${errors.email ? 'input-brand-error' : 'input-brand'} pl-12`}
                  placeholder="np. jan.kowalski@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors(prev => ({ ...prev, email: undefined }));
                    }
                  }}
                  aria-invalid={!!errors.email}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Hasło
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`${errors.password ? 'input-brand-error' : 'input-brand'} pl-12 pr-12`}
                  placeholder="Wprowadź swoje hasło"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors(prev => ({ ...prev, password: undefined }));
                    }
                  }}
                  aria-invalid={!!errors.password}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Remember me and Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Zapamiętaj mnie
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                  Zapomniałeś hasła?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-brand-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="brand-spinner"></div>
                    <span>Logowanie...</span>
                  </div>
                ) : (
                  'Zaloguj się'
                )}
              </button>
            </div>

            {/* Message */}
            {message && (
              <div className={`${hasError ? 'status-error' : 'status-success'}`}>
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

          {/* Sign up link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Nie masz jeszcze konta?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                Zarejestruj się
              </Link>
            </p>
          </div>
        </div>

        {/* Demo accounts */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Konta demo:</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Admin:</strong> admin@queueless.local / admin123</p>
            <p><strong>Właściciel:</strong> owner@queueless.local / owner123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
