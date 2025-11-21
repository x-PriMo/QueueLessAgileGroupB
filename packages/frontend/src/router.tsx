import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ReservationPage from './pages/ReservationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CompanyRequestPage from './pages/CompanyRequestPage';
import CompanyPreviewPage from './pages/CompanyPreviewPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import QueuePage from './pages/QueuePage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import OwnerPanel from './pages/OwnerPanel';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/company/:companyId" element={<CompanyPreviewPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route 
        path="/company-request" 
        element={
          <ProtectedRoute>
            <CompanyRequestPage />
          </ProtectedRoute>
        } 
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      
      {/* Protected routes for authenticated users */}
      <Route 
        path="/reserve" 
        element={
          <ProtectedRoute>
            <ReservationPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Role-based dashboards */}
      <Route 
        path="/dashboard/user" 
        element={
          <ProtectedRoute requiredRoles={["USER"]}>
            <UserDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard/admin" 
        element={
          <ProtectedRoute requiredRoles={["PLATFORM_ADMIN"]}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard/owner" 
        element={
          <ProtectedRoute requiredRoles={["OWNER"]}>
            <OwnerPanel />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/dashboard/worker" 
        element={
          <ProtectedRoute requiredRoles={["WORKER"]}>
            <WorkerDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Company-specific routes */}
      <Route 
        path="/company/:companyId/settings" 
        element={
          <ProtectedRoute requiredRoles={["OWNER"]}>
            <CompanySettingsPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/company/:companyId/queue" 
        element={
          <ProtectedRoute>
            <QueuePage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}
