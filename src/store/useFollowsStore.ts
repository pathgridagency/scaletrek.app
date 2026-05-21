import { create } from 'zustand';
import { persist } from '../storage/persist';
import { deleteFollow, insertFollow } from '../lib/sync/follows';

interface FollowsState {
  edges: Record<string, string[]>;
  follow: (followerId: string, followeeId: string) => void;
  unfollow: (followerId: string, followeeId: string) => void;
  isFollowing: (followerId: string, followeeId: string) => boolean;
  followingOf: (userId: string) => string[];
  followersOf: (userId: string) => string[];
  _hasHydrated: boolean;
  _setHasHydrated: (v: boolean) => void;
}

export const useFollowsStore = create<FollowsState>()(
  persist<FollowsState>(
    (set, get) => ({
      edges: {},
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      follow: (followerId, followeeId) => {
        if (followerId === followeeId) return;
        const current = get().edges[followerId] ?? [];
        if (current.includes(followeeId)) return;
        set({ edges: { ...get().edges, [followerId]: [...current, followeeId] } });
        insertFollow(followerId, followeeId).catch((err) => {
          console.warn('[follows] follow sync failed:', err);
          set({
            edges: {
              ...get().edges,
              [followerId]: (get().edges[followerId] ?? []).filter((id) => id !== followeeId),
            },
          });
        });
      },

      unfollow: (followerId, followeeId) => {
        const current = get().edges[followerId] ?? [];
        set({
          edges: { ...get().edges, [followerId]: current.filter((id) => id !== followeeId) },
        });
        deleteFollow(followerId, followeeId).catch((err) => {
          console.warn('[follows] unfollow sync failed:', err);
          set({
            edges: {
              ...get().edges,
              [followerId]: [...(get().edges[followerId] ?? []), followeeId],
            },
          });
        });
      },

      isFollowing: (followerId, followeeId) =>
        (get().edges[followerId] ?? []).includes(followeeId),

      followingOf: (userId) => get().edges[userId] ?? [],

      followersOf: (userId) =>
        Object.entries(get().edges)
          .filter(([, list]) => list.includes(userId))
          .map(([id]) => id),
    }),
    { name: 'follows', version: 2 },
  ),
);
