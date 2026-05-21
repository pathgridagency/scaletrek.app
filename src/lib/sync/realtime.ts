import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { fetchPosts, fetchMyEngagement } from './posts';
import { fetchThreadsForUser } from './chats';
import { fetchDealsForUser } from './deals';
import { fetchNotifications } from './notifications';
import { fetchFollows } from './follows';
import { useFeedStore } from '../../store/useFeedStore';
import { useChatStore } from '../../store/useChatStore';
import { useDealsStore } from '../../store/useDealsStore';
import { useNotificationsStore } from '../../store/useNotificationsStore';
import { useFollowsStore } from '../../store/useFollowsStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { fetchMySubscription } from './subscriptions';
import { useStoriesStore } from '../../store/useStoriesStore';
import { fetchStories } from './stories';
import { useSynergyStore } from '../../store/useSynergyStore';

// Phase 17 — postgres_changes subscriptions per store.
// Each subscription debounces a full refetch for that table; this keeps the
// implementation tiny and correct at the cost of one extra round-trip per
// change. Hot tables (messages, posts) get short debounce; cold (follows) get
// longer. Channels are torn down when the active user changes or signs out.

const DEBOUNCE_MS = 400;

const debounce = (fn: () => void, ms: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
};

const safe = async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[realtime] ${label} refetch failed:`, err);
    return null;
  }
};

export const subscribeRealtime = (userId: string): (() => void) => {
  const channels: RealtimeChannel[] = [];

  const refetchPosts = debounce(async () => {
    const posts = await safe('posts', fetchPosts);
    if (!posts) return;
    const engagement = await safe('engagement', () => fetchMyEngagement(userId));
    const liked = engagement?.likedIds ?? new Set<string>();
    const signaled = engagement?.signaledIds ?? new Set<string>();
    useFeedStore.setState({
      posts: posts.map((p) => ({
        ...p,
        likedBy: liked.has(p.id) ? [userId] : [],
        signaledBy: signaled.has(p.id) ? [userId] : [],
      })),
    });
  }, DEBOUNCE_MS);

  const refetchThreads = debounce(async () => {
    const threads = await safe('threads', () => fetchThreadsForUser(userId));
    if (threads) useChatStore.setState({ threads });
  }, DEBOUNCE_MS);

  const refetchNotifs = debounce(async () => {
    const items = await safe('notifications', () => fetchNotifications(userId));
    if (items) useNotificationsStore.setState({ items });
  }, DEBOUNCE_MS);

  const refetchDeals = debounce(async () => {
    const items = await safe('deals', () => fetchDealsForUser(userId));
    if (items) useDealsStore.setState({ items });
  }, DEBOUNCE_MS);

  const refetchFollows = debounce(async () => {
    const edges = await safe('follows', fetchFollows);
    if (edges) useFollowsStore.setState({ edges });
  }, DEBOUNCE_MS);

  const refetchSubscription = debounce(async () => {
    const sub = await safe('subscription', () => fetchMySubscription(userId));
    if (sub) useSubscriptionStore.getState().set(sub);
  }, DEBOUNCE_MS);

  const refetchStories = debounce(async () => {
    const rows = await safe('stories', fetchStories);
    if (rows) useStoriesStore.getState().set(rows);
  }, DEBOUNCE_MS);

  // Phase 34 — a new Synergy Match landing live.
  const refetchSynergy = debounce(() => {
    useSynergyStore.getState().loadMatches();
  }, DEBOUNCE_MS);

  channels.push(
    supabase
      .channel('realtime:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, refetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, refetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_signals' }, refetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_media' }, refetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, refetchPosts)
      .subscribe(),
  );

  channels.push(
    supabase
      .channel('realtime:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refetchThreads)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threads' }, refetchThreads)
      .subscribe(),
  );

  channels.push(
    supabase
      .channel('realtime:notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        refetchNotifs,
      )
      .subscribe(),
  );

  channels.push(
    supabase
      .channel('realtime:deals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, refetchDeals)
      .subscribe(),
  );

  channels.push(
    supabase
      .channel('realtime:follows')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, refetchFollows)
      .subscribe(),
  );

  channels.push(
    supabase
      .channel('realtime:subscriptions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${userId}` },
        refetchSubscription,
      )
      .subscribe(),
  );

  channels.push(
    supabase
      .channel('realtime:stories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, refetchStories)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'story_views' }, refetchStories)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'story_likes' }, refetchStories)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'story_comments' }, refetchStories)
      .subscribe(),
  );

  channels.push(
    supabase
      .channel('realtime:synergy')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partnership_matches' },
        refetchSynergy,
      )
      .subscribe(),
  );

  return () => {
    for (const ch of channels) {
      supabase.removeChannel(ch).catch(() => {});
    }
  };
};
