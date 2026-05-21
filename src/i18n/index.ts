import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { en } from './locales/en';
import { fr } from './locales/fr';
import { ar } from './locales/ar';
import { es } from './locales/es';

export const SUPPORTED_LOCALES = ['en', 'fr', 'ar', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
  es: 'Español',
};

export const RTL_LOCALES: SupportedLocale[] = ['ar'];

const i18n = new I18n({ en, fr, ar, es });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const detectDeviceLocale = (): SupportedLocale => {
  try {
    const list = getLocales?.() ?? [];
    for (const l of list) {
      const code = (l.languageCode ?? '').toLowerCase();
      if ((SUPPORTED_LOCALES as readonly string[]).includes(code)) {
        return code as SupportedLocale;
      }
    }
  } catch {}
  return 'en';
};

interface I18nState {
  locale: SupportedLocale;
  hydrated: boolean;
  setLocale: (locale: SupportedLocale) => void;
  hydrate: () => Promise<void>;
}

const STORAGE_KEY = '@scaletrek/locale';

export const useI18nStore = create<I18nState>((set, get) => ({
  locale: 'en',
  hydrated: false,
  setLocale: (locale) => {
    i18n.locale = locale;
    set({ locale });
    AsyncStorage.setItem(STORAGE_KEY, locale).catch(() => {});
  },
  hydrate: async () => {
    if (get().hydrated) return;
    let chosen: SupportedLocale | null = null;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
        chosen = stored as SupportedLocale;
      }
    } catch {}
    if (!chosen) chosen = detectDeviceLocale();
    i18n.locale = chosen;
    set({ locale: chosen, hydrated: true });
  },
}));

// Trigger hydration on import so first paint already has the right locale.
useI18nStore.getState().hydrate();

export const t = (key: string, options?: Record<string, unknown>): string => {
  // Re-bind the locale every call so changes after store init take effect even
  // for modules that captured `i18n` early.
  i18n.locale = useI18nStore.getState().locale;
  return i18n.t(key, options);
};

export const useTranslation = () => {
  const locale = useI18nStore((s) => s.locale);
  return {
    locale,
    isRTL: RTL_LOCALES.includes(locale),
    t: (key: string, options?: Record<string, unknown>) => {
      i18n.locale = locale;
      return i18n.t(key, options);
    },
  };
};
