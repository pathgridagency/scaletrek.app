import Constants from 'expo-constants';

type Env = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  fxApiUrl: string;
  defaultCurrency: string;
  defaultLanguage: string;
  googleWebClientId: string;
  googleAndroidClientId: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const read = (key: string, fallback = ''): string => {
  return (
    process.env[key] ??
    extra[key] ??
    extra[key.replace(/^EXPO_PUBLIC_/, '')] ??
    fallback
  );
};

export const SUPABASE_PROJECT_URL = 'https://yhezvbyngzimzmoyhtjl.supabase.co';

export const env: Env = {
  supabaseUrl: read('EXPO_PUBLIC_SUPABASE_URL', SUPABASE_PROJECT_URL),
  supabaseAnonKey: read('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  fxApiUrl: read('EXPO_PUBLIC_FX_API_URL', 'https://open.er-api.com/v6/latest'),
  defaultCurrency: read('EXPO_PUBLIC_DEFAULT_CURRENCY', 'USD'),
  defaultLanguage: read('EXPO_PUBLIC_DEFAULT_LANGUAGE', 'en'),
  googleWebClientId: read('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
  googleAndroidClientId: read('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
};

export const isSupabaseConfigured = () => !!env.supabaseUrl && !!env.supabaseAnonKey;
export const isGoogleSigninConfigured = () => !!env.googleWebClientId;
