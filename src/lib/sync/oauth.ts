import { Platform } from 'react-native';
import { supabase } from '../supabase';
import { env, isGoogleSigninConfigured } from '../../config/env';
import { User } from '../../data/mockData';
import { fetchProfile } from './profiles';

// ─────────────────────────── Google native ──────────────────────────
// Lazily import the native module so dev/web builds (and unconfigured
// installs) don't blow up at module load time.
type GoogleSigninAPI = {
  configure(opts: {
    webClientId: string;
    iosClientId?: string;
    offlineAccess?: boolean;
  }): void;
  hasPlayServices(opts?: { showPlayServicesUpdateDialog?: boolean }): Promise<boolean>;
  signIn(): Promise<unknown>;
  signOut(): Promise<void>;
  getTokens?(): Promise<{ idToken: string | null; accessToken: string }>;
};

let _google: GoogleSigninAPI | null = null;
let _googleConfigured = false;

const loadGoogle = (): GoogleSigninAPI | null => {
  if (_google) return _google;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-google-signin/google-signin');
    _google = mod.GoogleSignin ?? mod.default?.GoogleSignin ?? null;
    return _google;
  } catch {
    return null;
  }
};

const ensureGoogleConfigured = () => {
  if (_googleConfigured) return;
  const g = loadGoogle();
  if (!g) throw new Error('Google sign-in is not installed in this build.');
  if (!isGoogleSigninConfigured()) {
    throw new Error('Google client ID is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.');
  }
  g.configure({
    webClientId: env.googleWebClientId,
    offlineAccess: false,
  });
  _googleConfigured = true;
};

export const signInWithGoogle = async (): Promise<User> => {
  if (Platform.OS === 'web') throw new Error('Use OAuth web flow on web.');
  ensureGoogleConfigured();
  const g = loadGoogle();
  if (!g) throw new Error('Google sign-in module missing.');

  await g.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result: any = await g.signIn();
  // Library shape varies across versions: try common locations for the idToken.
  const idToken: string | undefined =
    result?.idToken ??
    result?.data?.idToken ??
    result?.user?.idToken ??
    (g.getTokens ? (await g.getTokens()).idToken ?? undefined : undefined);
  if (!idToken) throw new Error('Google did not return an idToken.');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Google sign-in failed: no user.');
  const profile = await fetchProfile(data.user.id);
  if (!profile) throw new Error('Profile not found after Google sign-in.');
  if (profile.suspended) {
    await supabase.auth.signOut();
    throw new Error('Account is suspended.');
  }
  return profile;
};

export const signOutGoogle = async (): Promise<void> => {
  const g = loadGoogle();
  if (!g) return;
  try {
    await g.signOut();
  } catch {
    // best effort
  }
};
