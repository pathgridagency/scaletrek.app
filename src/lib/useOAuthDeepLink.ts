import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { consumeOAuthRedirect } from './sync/oauth_web';
import { useAuthStore } from '../store/useAuthStore';
import { fetchMySubscription } from './sync/subscriptions';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { supabase } from './supabase';

// Wire the OAuth-style deep links (auth-callback for sign-in, reset-password
// for password reset). Both carry the session in the URL fragment; we set the
// session and, for reset-password, flip a flag so Navigator renders the
// password-reset screen.
export const useOAuthDeepLink = () => {
  useEffect(() => {
    let live = true;

    const handle = async (url: string | null | undefined) => {
      if (!live || !url) return;
      const isAuthCallback = url.includes('auth-callback');
      const isReset = url.includes('reset-password');
      const isBilling = url.includes('billing-success') || url.includes('billing-cancel');
      if (!isAuthCallback && !isReset && !isBilling) return;

      if (isBilling) {
        // Close the in-app browser that Stripe Checkout was using.
        WebBrowser.dismissBrowser().catch(() => {});
        if (url.includes('billing-success')) {
          // The webhook is the source of truth; the realtime channel will fire
          // when it lands. We refetch immediately as a courtesy in case
          // realtime hasn't pushed yet (network can lag a few seconds).
          const { data: session } = await supabase.auth.getSession();
          const userId = session.session?.user?.id;
          if (userId) {
            const sub = await fetchMySubscription(userId).catch(() => null);
            if (sub) useSubscriptionStore.getState().set(sub);
          }
        }
        return;
      }

      const ok = await consumeOAuthRedirect(url).catch((err) => {
        console.warn('[deeplink] consume failed:', err);
        return false;
      });
      if (ok && isReset) {
        useAuthStore.getState().setNeedsPasswordReset(true);
      }
    };

    Linking.getInitialURL()
      .then((u) => handle(u ?? null))
      .catch(() => {});

    const sub = Linking.addEventListener('url', (ev) => handle(ev.url));

    return () => {
      live = false;
      sub.remove();
    };
  }, []);
};
