import { supabase } from '../supabase';

// Phase 27 — Custom @handle (Pro feature).

const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;

export const validateHandle = (raw: string): { ok: true; handle: string } | { ok: false; error: string } => {
  const handle = raw.trim().toLowerCase().replace(/^@/, '');
  if (!HANDLE_PATTERN.test(handle)) {
    return {
      ok: false,
      error: 'Handle must be 3-24 characters, lowercase letters, numbers, or underscores.',
    };
  }
  return { ok: true, handle };
};

export const isHandleAvailable = async (handle: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('handle', handle)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length === 0;
};

export const setMyHandle = async (handle: string): Promise<void> => {
  const v = validateHandle(handle);
  if (!v.ok) throw new Error(v.error);
  const available = await isHandleAvailable(v.handle);
  if (!available) throw new Error('That handle is taken.');
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error('Not signed in.');
  const { error } = await supabase.from('profiles').update({ handle: v.handle }).eq('id', userId);
  if (error) throw error;
};
