import { supabase } from '../supabase';

// Phase 24 — Stories: 24h ephemeral photos/videos.

export interface StoryRow {
  id: string;
  userId: string;
  url: string;
  storagePath: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  durationMs?: number;
  caption?: string;
  createdAt: string;
  expiresAt: string;
  userName: string;
  userUsername?: string;
  userAvatar: string;
  userAvatarUrl?: string;
  userRole: 'dreamer' | 'investor' | 'admin';
  viewCount: number;
  seenByMe: boolean;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
}

export interface StoryComment {
  id: string;
  storyId: string;
  userId: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string;
  authorAvatarUrl?: string;
}

export interface AuthorStories {
  userId: string;
  userName: string;
  userUsername?: string;
  userAvatar: string;
  userAvatarUrl?: string;
  userRole: 'dreamer' | 'investor' | 'admin';
  stories: StoryRow[];
  allSeen: boolean;
}

const mapRow = (r: any): StoryRow => ({
  id: r.id,
  userId: r.user_id,
  url: r.url,
  storagePath: r.storage_path,
  type: r.type,
  width: r.width ?? undefined,
  height: r.height ?? undefined,
  durationMs: r.duration_ms ?? undefined,
  caption: r.caption ?? undefined,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  userName: r.user_name,
  userUsername: r.user_username ?? undefined,
  userAvatar: r.user_avatar,
  userAvatarUrl: r.avatar_url ?? undefined,
  userRole: r.user_role,
  viewCount: r.view_count ?? 0,
  seenByMe: r.seen_by_me ?? false,
  likeCount: r.like_count ?? 0,
  likedByMe: r.liked_by_me ?? false,
  commentCount: r.comment_count ?? 0,
});

export const fetchStories = async (): Promise<StoryRow[]> => {
  const { data, error } = await supabase
    .from('story_feed')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
};

export const groupStoriesByAuthor = (rows: StoryRow[]): AuthorStories[] => {
  const groups = new Map<string, AuthorStories>();
  // Drop anything past its 24h window. The `story_feed` view already filters
  // server-side, but a story can expire while the app stays open, or arrive
  // via realtime — so prune client-side too, otherwise it lingers in the rail.
  const now = Date.now();
  const live = rows.filter((r) => new Date(r.expiresAt).getTime() > now);
  // rows are newest-first; we want oldest-first within an author for tap-through
  const reversed = [...live].reverse();
  for (const r of reversed) {
    const g = groups.get(r.userId);
    if (g) {
      g.stories.push(r);
      g.allSeen = g.allSeen && r.seenByMe;
    } else {
      groups.set(r.userId, {
        userId: r.userId,
        userName: r.userName,
        userUsername: r.userUsername,
        userAvatar: r.userAvatar,
        userAvatarUrl: r.userAvatarUrl,
        userRole: r.userRole,
        stories: [r],
        allSeen: r.seenByMe,
      });
    }
  }
  return [...groups.values()].sort((a, b) => {
    if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
    const aLatest = a.stories[a.stories.length - 1].createdAt;
    const bLatest = b.stories[b.stories.length - 1].createdAt;
    return bLatest.localeCompare(aLatest);
  });
};

const inferContentType = (uri: string, mediaType: 'image' | 'video'): string => {
  const lower = uri.toLowerCase();
  if (mediaType === 'video') {
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  }
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

const extFromUri = (uri: string, fallback: string): string => {
  const m = uri.toLowerCase().match(/\.([a-z0-9]{2,5})(?:\?|$)/);
  return m ? m[1] : fallback;
};

export interface CreateStoryParams {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  durationMs?: number;
  caption?: string;
}

export const createStory = async (params: CreateStoryParams): Promise<StoryRow> => {
  const { data: session } = await supabase.auth.getUser();
  const myId = session.user?.id;
  if (!myId) throw new Error('Not signed in.');

  // See note in profilePhotos.ts — use arrayBuffer instead of blob so Android
  // content:// URIs don't end up as empty uploads.
  const resp = await fetch(params.uri);
  if (!resp.ok) throw new Error(`Couldn't read picked file (${resp.status}).`);
  const arrayBuffer = await resp.arrayBuffer();
  if (arrayBuffer.byteLength === 0) throw new Error('Picked file is empty.');
  const ext = extFromUri(params.uri, params.type === 'video' ? 'mp4' : 'jpg');
  const path = `${myId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const contentType = inferContentType(params.uri, params.type);

  const { error: uploadErr } = await supabase.storage
    .from('stories')
    .upload(path, arrayBuffer, { contentType, upsert: false });
  if (uploadErr) throw uploadErr;

  const { data: pub } = supabase.storage.from('stories').getPublicUrl(path);

  const { data, error } = await supabase
    .from('stories')
    .insert({
      user_id: myId,
      url: pub.publicUrl,
      storage_path: path,
      type: params.type,
      width: params.width ?? null,
      height: params.height ?? null,
      duration_ms: params.durationMs ?? null,
      caption: params.caption ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;

  // Fetch the joined view row so the new story renders the avatar/name.
  const { data: feedRow } = await supabase
    .from('story_feed')
    .select('*')
    .eq('id', data.id)
    .maybeSingle();
  return mapRow(feedRow ?? { ...data, user_name: '', user_avatar: '', user_role: 'dreamer', view_count: 0, seen_by_me: false });
};

export const markStorySeen = async (storyId: string): Promise<void> => {
  const { data: session } = await supabase.auth.getUser();
  const myId = session.user?.id;
  if (!myId) return;
  // ignore unique-violation on re-view
  await supabase
    .from('story_views')
    .insert({ story_id: storyId, viewer_id: myId })
    .then(() => undefined, () => undefined);
};

export const deleteStory = async (storyId: string, storagePath: string): Promise<void> => {
  const { error } = await supabase.from('stories').delete().eq('id', storyId);
  if (error) throw error;
  await supabase.storage.from('stories').remove([storagePath]).catch(() => undefined);
};

// ───────────────────────── likes ──────────────────────────────────
// `liked` is the CURRENT state: true means the caller already liked it and
// this call should remove the like.
export const toggleStoryLike = async (storyId: string, liked: boolean): Promise<void> => {
  const { data: session } = await supabase.auth.getUser();
  const myId = session.user?.id;
  if (!myId) throw new Error('Not signed in.');
  if (liked) {
    const { error } = await supabase
      .from('story_likes')
      .delete()
      .match({ story_id: storyId, user_id: myId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('story_likes')
      .insert({ story_id: storyId, user_id: myId });
    if (error && error.code !== '23505') throw error; // 23505 = already liked
  }
};

// ──────────────────────── comments ────────────────────────────────
const COMMENT_SELECT = 'id, story_id, user_id, body, created_at, author:profiles(name, avatar, avatar_url)';

const mapComment = (r: any): StoryComment => ({
  id: r.id,
  storyId: r.story_id,
  userId: r.user_id,
  body: r.body,
  createdAt: r.created_at,
  authorName: r.author?.name ?? 'User',
  authorAvatar: r.author?.avatar ?? '?',
  authorAvatarUrl: r.author?.avatar_url ?? undefined,
});

export const fetchStoryComments = async (storyId: string): Promise<StoryComment[]> => {
  const { data, error } = await supabase
    .from('story_comments')
    .select(COMMENT_SELECT)
    .eq('story_id', storyId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapComment);
};

export const addStoryComment = async (storyId: string, body: string): Promise<StoryComment> => {
  const { data: session } = await supabase.auth.getUser();
  const myId = session.user?.id;
  if (!myId) throw new Error('Not signed in.');
  const trimmed = body.trim().slice(0, 500);
  if (!trimmed) throw new Error('Comment is empty.');
  const { data, error } = await supabase
    .from('story_comments')
    .insert({ story_id: storyId, user_id: myId, body: trimmed })
    .select(COMMENT_SELECT)
    .single();
  if (error) throw error;
  return mapComment(data);
};

export const deleteStoryComment = async (commentId: string): Promise<void> => {
  const { error } = await supabase.from('story_comments').delete().eq('id', commentId);
  if (error) throw error;
};
