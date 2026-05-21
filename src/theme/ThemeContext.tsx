import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Palette, ThemeMode, darkPalette, lightPalette } from '../constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  preference: ThemePreference;
  palette: Palette;
  setPreference: (pref: ThemePreference) => void;
  toggle: () => void;
}

const STORAGE_KEY = '@scaletrek/theme-preference';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }, []);

  const mode: ThemeMode = useMemo(() => {
    if (preference === 'system') return system === 'dark' ? 'dark' : 'light';
    return preference;
  }, [preference, system]);

  const palette = mode === 'dark' ? darkPalette : lightPalette;

  const toggle = useCallback(() => {
    setPreference(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setPreference]);

  const value = useMemo(
    () => ({ mode, preference, palette, setPreference, toggle }),
    [mode, preference, palette, setPreference, toggle]
  );

  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
