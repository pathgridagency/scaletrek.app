import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../supabase';

// Web OAuth flow for providers without a first-party native module on Android:
// LinkedIn / GitHub / Twitter / Facebook (and any other Supabase-supported
// provider). Apple uses its own native module (handled in oauth.ts when wired).
export type OAuthProvider =
  | 'linkedin_oidc'
  | 'github'
  | 'twitter'
  | 'facebook'
  | 'apple';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_PATH = 'auth-callback';

const getRedirectUrl = (): string =>
  Linking.createURL(REDIRECT_PATH); // scaletrek://auth-callback

// Parses the URL Supabase sends back after the OAuth dance. The hash fragment
// carries access_token + refresh_token; we set the session from those.
export const consumeOAuthRedirect = async (url: string): Promise<boolean> => {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
    const params = new URLSearchParams(hash || parsed.search);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return false;
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      console.warn('[oauth_web] setSession failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[oauth_web] consume failed:', err);
    return false;
  }
};

export const signInWithOAuthProvider = async (
  provider: OAuthProvider,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const redirectTo = getRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.url) return { ok: false, error: 'OAuth provider returned no URL.' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    return {
      ok: false,
      error: result.type === 'cancel' ? 'Sign-in cancelled.' : 'OAuth flow did not complete.',
    };
  }
  const ok = await consumeOAuthRedirect(result.url);
  if (!ok) return { ok: false, error: 'Could not finalise session from provider response.' };
  return { ok: true };
};
