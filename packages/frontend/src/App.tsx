import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useEffect } from 'react'

// Layout components
import Layout from './components/Layout/Layout'
import AuthLayout from './components/Layout/AuthLayout'

// Public pages
import HomePage from './pages/HomePage'
import CompaniesPage from './pages/CompaniesPage'
import CompanyDetailPage from './pages/CompanyDetailsPage'
import QueueStatusPage from './pages/QueueStatusPage'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Protected pages
import DashboardPage from './pages/dashboard/DashboardPage'
import MyCompaniesPage from './pages/dashboard/MyCompaniesPage'
import CompanyManagementPage from './pages/dashboard/CompanyManagementPage'
import ReservationsPage from './pages/dashboard/ReservationsPage'
import QueueManagementPage from './pages/dashboard/QueueManagementPage'
import CompanyRegistrationPage from './pages/CompanyRegistrationPage'
import MyRegistrationsPage from './pages/dashboard/MyRegistrationsPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage'

// Components
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/ui/LoadingSpinner'

function App() {
  const { user, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="companies/:id" element={<CompanyDetailPage />} />
        <Route path="queue/:id" element={<QueueStatusPage />} />
      </Route>

      {/* Auth routes */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
        <Route path="forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />} />
        <Route path="reset-password" element={user ? <Navigate to="/dashboard" replace /> : <ResetPasswordPage />} />
      </Route>

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="companies" element={<MyCompaniesPage />} />
        <Route path="companies/:id" element={<CompanyManagementPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="queue" element={<QueueManagementPage />} />
        <Route path="company-registration" element={<CompanyRegistrationPage />} />
        <Route path="my-registrations" element={<MyRegistrationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="PLATFORM_ADMIN"><Layout /></ProtectedRoute>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="companies" element={<AdminCompaniesPage />} />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
