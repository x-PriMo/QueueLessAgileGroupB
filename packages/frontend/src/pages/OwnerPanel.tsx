import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import OwnerCompanySettings from '../components/OwnerCompanySettings';
import OwnerServicesManager from '../components/OwnerServicesManager';
import OwnerScheduleManager from '../components/OwnerScheduleManager';
import OwnerWorkersManager from '../components/OwnerWorkersManager';
import OwnerDashboard from '../components/OwnerDashboard';

export default function OwnerPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'company' | 'services' | 'schedule' | 'workers'>('dashboard');

  if (!user || user.role !== 'OWNER') {
    return <Navigate to="/unauthorized" />;
  }

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'company', name: 'Ustawienia firmy', icon: '🏢' },
    { id: 'services', name: 'Usługi', icon: '✂️' },
    { id: 'schedule', name: 'Grafik', icon: '📅' },
    { id: 'workers', name: 'Pracownicy', icon: '👥' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <OwnerDashboard />;
      case 'company':
        return <OwnerCompanySettings />;
      case 'services':
        return <OwnerServicesManager />;
      case 'schedule':
        return <OwnerScheduleManager />;
      case 'workers':
        return <OwnerWorkersManager />;
      default:
        return <OwnerDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel Właściciela</h1>
              <p className="text-sm text-gray-600">Zarządzaj swoją firmą</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/user')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Powrót do panelu użytkownika
            </button>
          </div>
          
          <nav className="flex space-x-8 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
}
