import { supabase } from '../supabase';

// Phase 7 — per-user identity reveal grants for investors.
// An investor can grant a specific dreamer permission to see their real
// identity (name/bio/momentum) without flipping the global reveal_to_all toggle.

export const grantReveal = async (toUserId: string): Promise<void> => {
  const { data: session } = await supabase.auth.getUser();
  const investorId = session.user?.id;
  if (!investorId) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('investor_reveals')
    .upsert(
      { investor_id: investorId, to_user_id: toUserId },
      { onConflict: 'investor_id,to_user_id' },
    );
  if (error) throw error;
};

export const revokeReveal = async (toUserId: string): Promise<void> => {
  const { data: session } = await supabase.auth.getUser();
  const investorId = session.user?.id;
  if (!investorId) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('investor_reveals')
    .delete()
    .eq('investor_id', investorId)
    .eq('to_user_id', toUserId);
  if (error) throw error;
};

export const listMyReveals = async (): Promise<string[]> => {
  const { data: session } = await supabase.auth.getUser();
  const investorId = session.user?.id;
  if (!investorId) return [];
  const { data, error } = await supabase
    .from('investor_reveals')
    .select('to_user_id')
    .eq('investor_id', investorId);
  if (error) throw error;
  return (data ?? []).map((r) => r.to_user_id as string);
};
