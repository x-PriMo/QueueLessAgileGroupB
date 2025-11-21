import React from 'react';
import { useUiPreferences } from '../contexts/UiPreferencesContext';

export default function UiPreferencesControls() {
  const { fontScale, toggleFontScale } = useUiPreferences();

  return (
    <div className="flex items-center space-x-2" aria-label="Ustawienia wyglądu">
      <button
        type="button"
        onClick={toggleFontScale}
        className="px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-100 text-gray-800 hover:bg-gray-200"
        aria-pressed={fontScale === 'large'}
        aria-label={fontScale === 'large' ? 'Zmniejsz rozmiar tekstu' : 'Zwiększ rozmiar tekstu'}
        title={fontScale === 'large' ? 'Tekst: większy' : 'Tekst: normalny'}
      >
        {fontScale === 'large' ? (
          <span className="inline-flex items-center space-x-2"><LargeAIcon /><span>A+</span></span>
        ) : (
          <span className="inline-flex items-center space-x-2"><SmallAIcon /><span>Aa</span></span>
        )}
      </button>
    </div>
  );
}

function SmallAIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <text x="3" y="15" fontSize="12" fontFamily="system-ui">Aa</text>
    </svg>
  );
}

function LargeAIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <text x="2" y="16" fontSize="14" fontFamily="system-ui">A+</text>
    </svg>
  );
}
