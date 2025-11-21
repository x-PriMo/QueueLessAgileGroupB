import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Apply saved font scale before React renders to avoid FOUC
try {
  const root = document.documentElement;
  const savedFont = (localStorage.getItem('ql_font_scale') as 'normal' | 'large') || 'normal';
  root.setAttribute('data-font', savedFont);
} catch {}

const rootEl = document.getElementById('root')!;
createRoot(rootEl).render(<App />);
