import { supabase } from '../supabase';
import { UserRole, VerificationLevel } from '../../data/mockData';

// Phase 35 — post comments sync layer. Reads from the `comment_feed` view
// (author profile + like_count + liked_by_me); writes to `comments` /
// `comment_likes`. Replies use `parent_id` (one level).

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  removed: boolean;
  editedAt?: string;
  createdAt: string;
  userName: string;
  userUsername: string;
  userAvatar: string;
  userAvatarUrl?: string;
  userRole: UserRole;
  userVerification: VerificationLevel;
  likeCount: number;
  likedByMe: boolean;
}

interface Row {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  removed: boolean;
  edited_at: string | null;
  created_at: string;
  user_name: string;
  user_username: string;
  user_avatar: string;
  user_avatar_url: string | null;
  user_role: UserRole;
  user_verification: VerificationLevel;
  like_count: number;
  liked_by_me: boolean;
}

const toComment = (r: Row): Comment => ({
  id: r.id,
  postId: r.post_id,
  userId: r.user_id,
  parentId: r.parent_id,
  content: r.content,
  removed: r.removed,
  editedAt: r.edited_at ?? undefined,
  createdAt: r.created_at,
  userName: r.user_name,
  userUsername: r.user_username,
  userAvatar: r.user_avatar,
  userAvatarUrl: r.user_avatar_url ?? undefined,
  userRole: r.user_role,
  userVerification: r.user_verification,
  likeCount: r.like_count,
  likedByMe: r.liked_by_me,
});

/** All comments for a post, oldest first (replies resolved client-side). */
export const fetchComments = async (postId: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from('comment_feed')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data as Row[]) ?? []).map(toComment);
};

export const addComment = async (
  postId: string,
  userId: string,
  content: string,
  parentId?: string | null,
): Promise<void> => {
  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    user_id: userId,
    parent_id: parentId ?? null,
    content,
  });
  if (error) throw error;
};

export const editComment = async (id: string, content: string): Promise<void> => {
  const { error } = await supabase
    .from('comments')
    .update({ content, edited_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

/** Soft-delete — keeps thread structure; RLS hides it from non-authors. */
export const deleteComment = async (id: string): Promise<void> => {
  const { error } = await supabase.from('comments').update({ removed: true }).eq('id', id);
  if (error) throw error;
};

export const toggleCommentLike = async (
  commentId: string,
  userId: string,
  liked: boolean,
): Promise<void> => {
  if (liked) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .match({ comment_id: commentId, user_id: userId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('comment_likes')
      .insert({ comment_id: commentId, user_id: userId });
    if (error && error.code !== '23505') throw error;
  }
};
