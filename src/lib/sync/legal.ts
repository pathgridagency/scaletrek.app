import { supabase } from '../supabase';

// Phase 26 — Privacy + Terms acceptance tracking.

export type LegalDocument = 'privacy' | 'terms';

export const recordAcceptance = async (document: LegalDocument, version: string): Promise<void> => {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error('Not signed in.');
  const { error } = await supabase.from('legal_acceptances').upsert(
    { user_id: userId, document, version, accepted_at: new Date().toISOString() },
    { onConflict: 'user_id,document' },
  );
  if (error) throw error;
};

export const recordBothAcceptances = async (
  privacyVersion: string,
  termsVersion: string,
): Promise<void> => {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error('Not signed in.');
  const { error } = await supabase.from('legal_acceptances').upsert(
    [
      { user_id: userId, document: 'privacy', version: privacyVersion, accepted_at: new Date().toISOString() },
      { user_id: userId, document: 'terms', version: termsVersion, accepted_at: new Date().toISOString() },
    ],
    { onConflict: 'user_id,document' },
  );
  if (error) throw error;
};

export interface AcceptanceRow {
  document: LegalDocument;
  version: string;
  acceptedAt: string;
}

export const fetchMyAcceptances = async (): Promise<AcceptanceRow[]> => {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('legal_acceptances')
    .select('document,version,accepted_at')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    document: r.document,
    version: r.version,
    acceptedAt: r.accepted_at,
  }));
};
