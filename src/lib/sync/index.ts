import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { fetchAllProfiles, fetchProfile } from './profiles';
import { fetchPosts, fetchMyEngagement } from './posts';
import { fetchFollows } from './follows';
import { fetchThreadsForUser } from './chats';
import { fetchDealsForUser } from './deals';
import { fetchNotifications } from './notifications';
import { fetchMyBlocks, fetchReports, fetchVerificationRequests } from './moderation';
import { fetchMySubscription } from './subscriptions';
import { fetchStories } from './stories';
import { useAuthStore } from '../../store/useAuthStore';
import { useFeedStore } from '../../store/useFeedStore';
import { useFollowsStore } from '../../store/useFollowsStore';
import { useChatStore } from '../../store/useChatStore';
import { useDealsStore } from '../../store/useDealsStore';
import { useNotificationsStore } from '../../store/useNotificationsStore';
import { useModerationStore } from '../../store/useModerationStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useStoriesStore } from '../../store/useStoriesStore';
import { useSynergyStore } from '../../store/useSynergyStore';
import { subscribeRealtime } from './realtime';

const safe = async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[sync] ${label} failed:`, err);
    return null;
  }
};

const hydrateForUser = async (userId: string) => {
  const [
    profiles,
    posts,
    follows,
    threads,
    deals,
    notifs,
    reports,
    verifs,
    engagement,
    blocks,
    subscription,
    stories,
  ] = await Promise.all([
    safe('profiles', fetchAllProfiles),
    safe('posts', fetchPosts),
    safe('follows', fetchFollows),
    safe('threads', () => fetchThreadsForUser(userId)),
    safe('deals', () => fetchDealsForUser(userId)),
    safe('notifications', () => fetchNotifications(userId)),
    safe('reports', fetchReports),
    safe('verif', fetchVerificationRequests),
    safe('engagement', () => fetchMyEngagement(userId)),
    safe('blocks', fetchMyBlocks),
    safe('subscription', () => fetchMySubscription(userId)),
    safe('stories', fetchStories),
  ]);

  if (profiles) useAuthStore.setState({ users: profiles });
  if (posts) {
    // Tag posts with likedBy/signaledBy for the current user so existing
    // optimistic toggle logic continues to work.
    const liked = engagement?.likedIds ?? new Set<string>();
    const signaled = engagement?.signaledIds ?? new Set<string>();
    const tagged = posts.map((p) => ({
      ...p,
      likedBy: liked.has(p.id) ? [userId] : [],
      signaledBy: signaled.has(p.id) ? [userId] : [],
    }));
    useFeedStore.setState({ posts: tagged });
  }
  if (follows) useFollowsStore.setState({ edges: follows });
  if (threads) useChatStore.setState({ threads });
  if (deals) useDealsStore.setState({ items: deals });
  if (notifs) useNotificationsStore.setState({ items: notifs });
  if (reports || verifs || blocks) {
    useModerationStore.setState({
      reports: reports ?? [],
      verificationRequests: verifs ?? [],
      blockedIds: blocks ?? [],
    });
  }
  if (subscription) useSubscriptionStore.getState().set(subscription);
  if (stories) useStoriesStore.getState().set(stories);
  useStoriesStore.getState().setHydrated();
};

const clearAll = () => {
  useFeedStore.setState({ posts: [] });
  useChatStore.setState({ threads: [], encryption: {} });
  useDealsStore.setState({ items: [] });
  useNotificationsStore.setState({ items: [] });
  useFollowsStore.setState({ edges: {} });
  useModerationStore.setState({ reports: [], verificationRequests: [] });
  useAuthStore.setState({ users: [] });
  useSubscriptionStore.getState().reset();
  useStoriesStore.setState({ stories: [] });
  useSynergyStore.getState().reset();
};

export const useSupabaseSync = () => {
  const lastUserId = useRef<string | null>(null);
  const hydratingFor = useRef<string | null>(null);
  const realtimeCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    const onSession = async (userId: string | null) => {
      if (cancelled) return;
      if (userId === lastUserId.current) return;
      lastUserId.current = userId;

      // Tear down any prior realtime subscriptions before swapping users.
      if (realtimeCleanup.current) {
        realtimeCleanup.current();
        realtimeCleanup.current = null;
      }

      if (!userId) {
        clearAll();
        useAuthStore.setState({
          isAuthenticated: false,
          user: null,
          role: null,
          onboarded: false,
        });
        return;
      }

      hydratingFor.current = userId;
      const profile = await safe('profile-self', () => fetchProfile(userId));
      if (cancelled || hydratingFor.current !== userId) return;
      if (profile) {
        // The profile row carries the persisted `onboarded` flag (phase 16),
        // so cold-start session restore can trust it directly. Login/signup
        // flows still set it explicitly to handle the same-session case where
        // the profile fetch races the sign-up handler.
        const current = useAuthStore.getState();
        if (current.user) {
          useAuthStore.setState({
            isAuthenticated: true,
            user: profile,
            role: profile.role,
          });
        } else {
          useAuthStore.setState({
            isAuthenticated: true,
            user: profile,
            role: profile.role,
            onboarded: profile.onboarded === true,
          });
        }
      }
      await hydrateForUser(userId);
      if (cancelled || hydratingFor.current !== userId) return;
      // Wire up postgres_changes after the initial hydration so we never miss
      // a row inserted between hydrate and subscribe.
      realtimeCleanup.current = subscribeRealtime(userId);
    };

    supabase.auth.getSession().then(({ data }) => {
      onSession(data.session?.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      onSession(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (realtimeCleanup.current) {
        realtimeCleanup.current();
        realtimeCleanup.current = null;
      }
    };
  }, []);
};

export { hydrateForUser };
