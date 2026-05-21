import { supabase } from '../supabase';
import { PostMedia } from '../../data/mockData';

// Phase 14 — post media (photos + videos) uploads + table sync.

export const FREE_TIER_MAX_ITEMS = 1;
export const FREE_TIER_MAX_BYTES = 10 * 1024 * 1024;
export const PRO_TIER_MAX_ITEMS = 6;
export const PRO_TIER_MAX_BYTES = 100 * 1024 * 1024;

export interface UploadedMedia {
  storagePath: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  width?: number;
  height?: number;
  durationMs?: number;
}

const inferContentType = (uri: string, mediaType: 'image' | 'video'): string => {
  const lower = uri.toLowerCase();
  if (mediaType === 'video') {
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  }
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
};

const extFromUri = (uri: string, fallback: string): string => {
  const m = uri.toLowerCase().match(/\.([a-z0-9]{2,5})(?:\?|$)/);
  return m ? m[1] : fallback;
};

export const uploadPostMedia = async (params: {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  durationMs?: number;
}): Promise<UploadedMedia> => {
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

  const { error } = await supabase.storage
    .from('post-media')
    .upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw error;

  const { data: pub } = supabase.storage.from('post-media').getPublicUrl(path);

  return {
    storagePath: path,
    url: pub.publicUrl,
    type: params.type,
    size: arrayBuffer.byteLength,
    width: params.width,
    height: params.height,
    durationMs: params.durationMs,
  };
};

export const insertPostMediaRows = async (
  postId: string,
  userId: string,
  items: UploadedMedia[],
): Promise<void> => {
  if (items.length === 0) return;
  const rows = items.map((m, i) => ({
    post_id: postId,
    user_id: userId,
    url: m.url,
    storage_path: m.storagePath,
    type: m.type,
    width: m.width ?? null,
    height: m.height ?? null,
    duration_ms: m.durationMs ?? null,
    size_bytes: m.size,
    position: i,
  }));
  const { error } = await supabase.from('post_media').insert(rows);
  if (error) throw error;
};

interface MediaJson {
  id: string;
  url: string;
  type: 'image' | 'video';
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  position: number;
}

export const parseMediaJson = (raw: unknown): PostMedia[] | undefined => {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return (raw as MediaJson[])
    .map((m, idx) => ({
      id: m.id,
      url: m.url,
      type: m.type,
      width: m.width ?? undefined,
      height: m.height ?? undefined,
      durationMs: m.duration_ms ?? undefined,
      position: m.position ?? idx,
    }))
    .sort((a, b) => a.position - b.position);
};
