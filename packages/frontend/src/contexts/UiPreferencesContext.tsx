import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type FontScale = 'normal' | 'large';

interface UiPreferencesContextType {
  fontScale: FontScale;
  setFontScale: (s: FontScale) => void;
  toggleFontScale: () => void;
}

const UiPreferencesContext = createContext<UiPreferencesContextType | undefined>(undefined);

const FONT_KEY = 'ql_font_scale';

export function UiPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [fontScale, setFontScaleState] = useState<FontScale>('normal');

  useEffect(() => {
    const savedFont = (localStorage.getItem(FONT_KEY) as FontScale) || 'normal';
    setFontScaleState(savedFont);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-font', fontScale);
    localStorage.setItem(FONT_KEY, fontScale);
  }, [fontScale]);

  const value = useMemo<UiPreferencesContextType>(() => ({
    fontScale,
    setFontScale: (s: FontScale) => setFontScaleState(s),
    toggleFontScale: () => setFontScaleState((prev) => (prev === 'normal' ? 'large' : 'normal')),
  }), [fontScale]);

  return (
    <UiPreferencesContext.Provider value={value}>
      {children}
    </UiPreferencesContext.Provider>
  );
}

export function useUiPreferences() {
  const ctx = useContext(UiPreferencesContext);
  if (!ctx) throw new Error('useUiPreferences must be used within UiPreferencesProvider');
  return ctx;
}
