import { create } from 'zustand';
import { StoryRow, AuthorStories, groupStoriesByAuthor } from '../lib/sync/stories';

interface State {
  stories: StoryRow[];
  loading: boolean;
  _hasHydrated: boolean;
  set: (stories: StoryRow[]) => void;
  upsertOne: (story: StoryRow) => void;
  removeOne: (id: string) => void;
  markSeenLocal: (id: string) => void;
  toggleLikeLocal: (id: string) => void;
  applyCommentDelta: (id: string, delta: number) => void;
  groupedByAuthor: () => AuthorStories[];
  setHydrated: () => void;
  setLoading: (loading: boolean) => void;
}

export const useStoriesStore = create<State>((set, get) => ({
  stories: [],
  loading: false,
  _hasHydrated: false,
  set: (stories) => set({ stories }),
  upsertOne: (story) =>
    set((s) => {
      const idx = s.stories.findIndex((x) => x.id === story.id);
      if (idx === -1) return { stories: [story, ...s.stories] };
      const copy = s.stories.slice();
      copy[idx] = story;
      return { stories: copy };
    }),
  removeOne: (id) => set((s) => ({ stories: s.stories.filter((x) => x.id !== id) })),
  markSeenLocal: (id) =>
    set((s) => ({
      stories: s.stories.map((x) => (x.id === id ? { ...x, seenByMe: true, viewCount: x.viewCount + 1 } : x)),
    })),
  toggleLikeLocal: (id) =>
    set((s) => ({
      stories: s.stories.map((x) => {
        if (x.id !== id) return x;
        const likedByMe = !x.likedByMe;
        return { ...x, likedByMe, likeCount: Math.max(0, x.likeCount + (likedByMe ? 1 : -1)) };
      }),
    })),
  applyCommentDelta: (id, delta) =>
    set((s) => ({
      stories: s.stories.map((x) =>
        x.id === id ? { ...x, commentCount: Math.max(0, x.commentCount + delta) } : x,
      ),
    })),
  groupedByAuthor: () => groupStoriesByAuthor(get().stories),
  setHydrated: () => set({ _hasHydrated: true }),
  setLoading: (loading) => set({ loading }),
}));
