import { create } from 'zustand';
import {
  Comment,
  fetchComments,
  addComment,
  editComment,
  deleteComment,
  toggleCommentLike,
} from '../lib/sync/comments';

// Phase 35 — post comments store, keyed by postId. Server-derived, not
// persisted; loaded when a post detail view opens, kept fresh by realtime.

interface CommentsState {
  byPost: Record<string, Comment[]>;
  loading: Record<string, boolean>;
  load: (postId: string) => Promise<void>;
  add: (postId: string, userId: string, content: string, parentId?: string | null) => Promise<void>;
  edit: (postId: string, commentId: string, content: string) => Promise<void>;
  remove: (postId: string, commentId: string) => Promise<void>;
  toggleLike: (postId: string, commentId: string, userId: string) => void;
  countFor: (postId: string) => number;
}

export const useCommentsStore = create<CommentsState>((set, get) => ({
  byPost: {},
  loading: {},

  load: async (postId) => {
    set((s) => ({ loading: { ...s.loading, [postId]: true } }));
    try {
      const list = await fetchComments(postId);
      set((s) => ({
        byPost: { ...s.byPost, [postId]: list },
        loading: { ...s.loading, [postId]: false },
      }));
    } catch {
      set((s) => ({ loading: { ...s.loading, [postId]: false } }));
    }
  },

  add: async (postId, userId, content, parentId) => {
    await addComment(postId, userId, content, parentId);
    await get().load(postId);
  },

  edit: async (postId, commentId, content) => {
    await editComment(commentId, content);
    await get().load(postId);
  },

  remove: async (postId, commentId) => {
    await deleteComment(commentId);
    await get().load(postId);
  },

  toggleLike: (postId, commentId, userId) => {
    const list = get().byPost[postId] ?? [];
    const target = list.find((c) => c.id === commentId);
    if (!target) return;
    const liked = target.likedByMe;
    // Optimistic.
    set((s) => ({
      byPost: {
        ...s.byPost,
        [postId]: (s.byPost[postId] ?? []).map((c) =>
          c.id === commentId
            ? { ...c, likedByMe: !liked, likeCount: Math.max(0, c.likeCount + (liked ? -1 : 1)) }
            : c,
        ),
      },
    }));
    toggleCommentLike(commentId, userId, liked).catch(() => {
      // Revert on failure.
      set((s) => ({
        byPost: {
          ...s.byPost,
          [postId]: (s.byPost[postId] ?? []).map((c) =>
            c.id === commentId
              ? { ...c, likedByMe: liked, likeCount: Math.max(0, c.likeCount + (liked ? 1 : -1)) }
              : c,
          ),
        },
      }));
    });
  },

  countFor: (postId) => (get().byPost[postId] ?? []).filter((c) => !c.removed).length,
}));
