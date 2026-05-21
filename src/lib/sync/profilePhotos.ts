import { supabase } from '../supabase';

// Phase 22 — upload helpers for the avatar and cover-photo buckets.
// Each user uploads under <bucket>/<uid>/... per the storage RLS.
//
// IMPORTANT: On React Native (Android especially), `fetch(uri).blob()` returns
// a Blob whose .size is 0 for content:// URIs returned by ImagePicker, which
// makes Supabase silently upload an empty file or fail with a misleading
// "network" error. Using `arrayBuffer()` is reliable across platforms.

const inferContentType = (uri: string): string => {
  const l = uri.toLowerCase();
  if (l.endsWith('.png')) return 'image/png';
  if (l.endsWith('.webp')) return 'image/webp';
  if (l.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
};

const extFromUri = (uri: string): string => {
  const m = uri.toLowerCase().match(/\.([a-z0-9]{2,5})(?:\?|$)/);
  return m ? m[1] : 'jpg';
};

export const uploadProfilePhoto = async (
  bucket: 'avatars' | 'profile-covers',
  uri: string,
): Promise<string> => {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error('Not signed in.');
  const resp = await fetch(uri);
  if (!resp.ok) throw new Error(`Couldn't read picked image (${resp.status}).`);
  const arrayBuffer = await resp.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Picked image is empty — please pick a different photo.');
  }
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFromUri(uri)}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType: inferContentType(uri), upsert: false });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return pub.publicUrl;
};
