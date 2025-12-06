
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import OwnerDashboard from './pages/OwnerDashboard';

// Apply saved font scale before React renders to avoid FOUC
try {
  // const dayOfWeekForDate = (dateStr: string) => {
  //     const date = new Date(dateStr);
  //     const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  //     return days[date.getDay()];
  // };
  const root = document.documentElement;
  const savedFont = (localStorage.getItem('ql_font_scale') as 'normal' | 'large') || 'normal';
  root.setAttribute('data-font', savedFont);
} catch {
  // Ignore error
}

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(<App />);
