import { create } from 'zustand';
import { persist } from '../storage/persist';
import { FeedType, ShowcasePost } from '../data/mockData';
import {
  buildCreatePostRow,
  createPost as createPostRemote,
  setPostRemoved,
  togglePostLike as toggleLikeRemote,
  togglePostSignal as toggleSignalRemote,
  fetchPosts,
  approvePostRemote,
  rejectPostRemote,
} from '../lib/sync/posts';
import { UploadedMedia } from '../lib/sync/media';
import { useAuthStore } from './useAuthStore';

export interface CreatePostInput {
  userId: string;
  userName: string;
  userAvatar: string;
  verificationLevel: ShowcasePost['verificationLevel'];
  type: FeedType;
  milestoneTitle: string;
  description: string;
  tags: string[];
  industry: string;
  metric?: { label: string; value: string; unit?: string };
  fundingGoal?: string;
  currentFunding?: string;
  riskScore?: number;
  rewardScore?: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'metric';
  media?: UploadedMedia[];
}

export type FeedView = 'explore' | 'dreamer' | 'reality';
export type SortMode = 'recent' | 'top';

interface FeedState {
  posts: ShowcasePost[];
  activeFeed: FeedType;
  feedView: FeedView;
  sortMode: SortMode;
  riskFilter: number;
  rewardFilter: number;
  toggleFeed: (type: FeedType) => void;
  setFeedView: (view: FeedView) => void;
  setSortMode: (mode: SortMode) => void;
  setRiskFilter: (value: number) => void;
  setRewardFilter: (value: number) => void;
  createPost: (input: CreatePostInput) => Promise<ShowcasePost | null>;
  toggleLike: (postId: string, userId: string) => void;
  toggleSignal: (postId: string, userId: string) => void;
  removePost: (postId: string) => void;
  restorePost: (postId: string) => void;
  approvePost: (postId: string) => Promise<void>;
  rejectPost: (postId: string, reason?: string) => Promise<void>;
  refresh: () => Promise<void>;
  filteredFor: (feed: FeedType) => ShowcasePost[];
  feedItems: () => ShowcasePost[];
  pendingReality: () => ShowcasePost[];
  _hasHydrated: boolean;
  _setHasHydrated: (v: boolean) => void;
}

const formatAge = (ms: number) => {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export const useFeedStore = create<FeedState>()(
  persist<FeedState>(
    (set, get) => ({
      posts: [],
      activeFeed: 'dreamer',
      feedView: 'explore',
      sortMode: 'recent',
      riskFilter: 10,
      rewardFilter: 0,
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      toggleFeed: (type) => set({ activeFeed: type }),
      setFeedView: (view) =>
        set({
          feedView: view,
          // Keep activeFeed in sync so InvestorScreen + filteredFor still work.
          activeFeed: view === 'reality' ? 'reality' : view === 'dreamer' ? 'dreamer' : get().activeFeed,
        }),
      setSortMode: (mode) => set({ sortMode: mode }),
      setRiskFilter: (value) => set({ riskFilter: value }),
      setRewardFilter: (value) => set({ rewardFilter: value }),

      createPost: async (input) => {
        const media = input.media ?? [];
        const hero = media[0];
        const row = buildCreatePostRow({
          ...input,
          mediaType: hero ? hero.type : input.mediaType,
          mediaUrl: hero ? hero.url : input.mediaUrl,
        });
        // Throw so the screen can show the real error. We log here so it shows
        // up in `adb logcat` too.
        try {
          const post = await createPostRemote(row, media);
          set({ posts: [post, ...get().posts] });
          return post;
        } catch (err) {
          console.warn('[feed] createPost failed:', err);
          throw err;
        }
      },

      toggleLike: (postId, userId) => {
        const current = get().posts.find((p) => p.id === postId);
        const liked = current?.likedBy?.includes(userId) ?? false;
        set({
          posts: get().posts.map((p) => {
            if (p.id !== postId) return p;
            return {
              ...p,
              likes: liked ? Math.max(0, p.likes - 1) : p.likes + 1,
              likedBy: liked
                ? (p.likedBy ?? []).filter((id) => id !== userId)
                : [...(p.likedBy ?? []), userId],
            };
          }),
        });
        toggleLikeRemote(postId, userId, liked).catch((err) => {
          console.warn('[feed] toggleLike sync failed:', err);
          // Revert on failure.
          set({
            posts: get().posts.map((p) => {
              if (p.id !== postId) return p;
              return {
                ...p,
                likes: liked ? p.likes + 1 : Math.max(0, p.likes - 1),
                likedBy: liked
                  ? [...(p.likedBy ?? []), userId]
                  : (p.likedBy ?? []).filter((id) => id !== userId),
              };
            }),
          });
        });
      },

      toggleSignal: (postId, userId) => {
        const current = get().posts.find((p) => p.id === postId);
        const signaled = current?.signaledBy?.includes(userId) ?? false;
        set({
          posts: get().posts.map((p) => {
            if (p.id !== postId) return p;
            return {
              ...p,
              signals: signaled ? Math.max(0, p.signals - 1) : p.signals + 1,
              signaledBy: signaled
                ? (p.signaledBy ?? []).filter((id) => id !== userId)
                : [...(p.signaledBy ?? []), userId],
            };
          }),
        });
        toggleSignalRemote(postId, userId, signaled).catch((err) => {
          console.warn('[feed] toggleSignal sync failed:', err);
          set({
            posts: get().posts.map((p) => {
              if (p.id !== postId) return p;
              return {
                ...p,
                signals: signaled ? p.signals + 1 : Math.max(0, p.signals - 1),
                signaledBy: signaled
                  ? [...(p.signaledBy ?? []), userId]
                  : (p.signaledBy ?? []).filter((id) => id !== userId),
              };
            }),
          });
        });
      },

      removePost: (postId) => {
        set({ posts: get().posts.map((p) => (p.id === postId ? { ...p, removed: true } : p)) });
        setPostRemoved(postId, true).catch((err) =>
          console.warn('[feed] removePost sync failed:', err),
        );
      },

      restorePost: (postId) => {
        set({ posts: get().posts.map((p) => (p.id === postId ? { ...p, removed: false } : p)) });
        setPostRemoved(postId, false).catch((err) =>
          console.warn('[feed] restorePost sync failed:', err),
        );
      },

      approvePost: async (postId) => {
        await approvePostRemote(postId);
        set({
          posts: get().posts.map((p) => (p.id === postId ? { ...p, status: 'approved' } : p)),
        });
      },

      rejectPost: async (postId, reason) => {
        await rejectPostRemote(postId, reason);
        set({
          posts: get().posts.map((p) =>
            p.id === postId ? { ...p, status: 'rejected', moderationReason: reason } : p,
          ),
        });
      },

      refresh: async () => {
        const posts = await fetchPosts();
        // Preserve client-side optimistic state (likedBy/signaledBy) where the
        // server view doesn't echo them.
        const prev = get().posts;
        const merged = posts.map((p) => {
          const old = prev.find((x) => x.id === p.id);
          return old ? { ...p, likedBy: old.likedBy, signaledBy: old.signaledBy } : p;
        });
        set({ posts: merged });
      },

      filteredFor: (feed) => {
        const { posts, riskFilter, rewardFilter } = get();
        return posts
          .filter((p) => !p.removed)
          .filter((p) => p.type === feed)
          .filter((p) => p.riskScore <= riskFilter && p.rewardScore >= rewardFilter)
          .map((p) => (p.createdAtMs ? { ...p, createdAt: formatAge(p.createdAtMs) } : p));
      },

      feedItems: () => {
        const { posts, feedView, sortMode } = get();
        const meId = useAuthStore.getState().user?.id;
        // The public Feed / Explore shows every visible post. The risk/reward
        // sliders are an Investor-screen tool (see `filteredFor`) and must NOT
        // filter the social feed — tweaking them there would silently empty it.
        const visible = posts
          .filter((p) => !p.removed)
          // Hide pending/rejected posts from everyone EXCEPT their author, so
          // the author sees their own post land immediately (with a "Pending
          // review" banner) instead of the feed appearing not to update.
          .filter((p) => !p.status || p.status === 'approved' || p.userId === meId)
          .filter((p) => (feedView === 'explore' ? true : p.type === feedView));
        const sorted =
          sortMode === 'top'
            ? [...visible].sort(
                (a, b) =>
                  b.momentumScore + b.signals * 3 + b.likes * 0.5 -
                  (a.momentumScore + a.signals * 3 + a.likes * 0.5),
              )
            : [...visible].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
        return sorted.map((p) => (p.createdAtMs ? { ...p, createdAt: formatAge(p.createdAtMs) } : p));
      },

      pendingReality: () =>
        get()
          .posts
          .filter((p) => p.type === 'reality' && p.status === 'pending' && !p.removed)
          .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)),
    }),
    {
      name: 'feed',
      // v4: stop persisting `posts`. It is server state — persisting it risks a
      // stale/empty array rehydrating *after* the network fetch and blanking
      // the feed. Posts are always re-fetched fresh on auth + via realtime.
      version: 4,
      partialize: (s) => ({
        activeFeed: s.activeFeed,
        feedView: s.feedView,
        sortMode: s.sortMode,
        riskFilter: s.riskFilter,
        rewardFilter: s.rewardFilter,
      }),
    },
  ),
);
