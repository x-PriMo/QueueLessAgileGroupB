import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, Role } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: Role[];
  requireAuth?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="brand-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Jeśli wymaga uwierzytelnienia, ale użytkownik nie jest zalogowany
  if (requireAuth && !user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  // Jeśli nie wymaga uwierzytelnienia i użytkownik jest zalogowany, przekieruj do dashboardu
  if (!requireAuth && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  // Jeśli są wymagane konkretne role
  if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

function getDashboardPath(role: Role): string {
  switch (role) {
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
}
