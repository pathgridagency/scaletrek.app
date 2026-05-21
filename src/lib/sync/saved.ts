import { supabase } from '../supabase';

// Phase 27 — Saved posts (Pro feature).

export const fetchSavedPostIds = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('saved_posts')
    .select('post_id')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => r.post_id as string);
};

export const savePost = async (postId: string): Promise<void> => {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('saved_posts')
    .upsert({ user_id: userId, post_id: postId }, { onConflict: 'user_id,post_id' });
  if (error) throw error;
};

export const unsavePost = async (postId: string): Promise<void> => {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('saved_posts')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);
  if (error) throw error;
};
