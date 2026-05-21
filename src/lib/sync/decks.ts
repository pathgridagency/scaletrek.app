import { supabase } from '../supabase';

// Phase 13 — deck shares with NDA gating + signed-URL expiry.

export interface DeckShare {
  id: string;
  founderId: string;
  investorId: string;
  filePath: string;
  filename: string;
  sizeBytes?: number | null;
  ndaText: string;
  ndaSignedAt?: string | null;
  grantedAt?: string | null;
  expiresAt?: string | null;
  revoked: boolean;
  createdAt: string;
}

interface DeckShareRow {
  id: string;
  founder_id: string;
  investor_id: string;
  file_path: string;
  filename: string;
  size_bytes: number | null;
  nda_text: string;
  nda_signed_at: string | null;
  granted_at: string | null;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
}

const rowToShare = (r: DeckShareRow): DeckShare => ({
  id: r.id,
  founderId: r.founder_id,
  investorId: r.investor_id,
  filePath: r.file_path,
  filename: r.filename,
  sizeBytes: r.size_bytes,
  ndaText: r.nda_text,
  ndaSignedAt: r.nda_signed_at,
  grantedAt: r.granted_at,
  expiresAt: r.expires_at,
  revoked: r.revoked,
  createdAt: r.created_at,
});

// Founder side ─────────────────────────────────────────────────────
export const uploadDeck = async (
  uri: string,
  filename: string,
  contentType = 'application/pdf',
): Promise<{ path: string; size: number }> => {
  const { data: session } = await supabase.auth.getUser();
  const myId = session.user?.id;
  if (!myId) throw new Error('Not signed in.');

  const resp = await fetch(uri);
  const blob = await resp.blob();
  const path = `${myId}/${Date.now()}-${filename.replace(/[^A-Za-z0-9._-]/g, '_')}`;

  const { error } = await supabase.storage
    .from('decks')
    .upload(path, blob, {
      contentType,
      upsert: false,
    });
  if (error) throw error;
  return { path, size: blob.size };
};

export const createDeckShare = async (params: {
  investorId: string;
  filePath: string;
  filename: string;
  sizeBytes?: number;
  ndaText?: string;
  expiresInHours?: number;
}): Promise<DeckShare> => {
  const { data: session } = await supabase.auth.getUser();
  const founderId = session.user?.id;
  if (!founderId) throw new Error('Not signed in.');
  const expiresAt = params.expiresInHours
    ? new Date(Date.now() + params.expiresInHours * 3600 * 1000).toISOString()
    : null;
  const grantedAt = new Date().toISOString();
  const insertPayload: Record<string, unknown> = {
    founder_id: founderId,
    investor_id: params.investorId,
    file_path: params.filePath,
    filename: params.filename,
    size_bytes: params.sizeBytes ?? null,
    granted_at: grantedAt,
    expires_at: expiresAt,
  };
  if (params.ndaText) insertPayload.nda_text = params.ndaText;
  const { data, error } = await supabase
    .from('deck_shares')
    .insert(insertPayload)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return rowToShare(data as DeckShareRow);
};

export const revokeDeckShare = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('deck_shares')
    .update({ revoked: true })
    .eq('id', id);
  if (error) throw error;
};

// Investor side ────────────────────────────────────────────────────
export const signNda = async (shareId: string): Promise<DeckShare> => {
  const { data, error } = await supabase
    .from('deck_shares')
    .update({ nda_signed_at: new Date().toISOString() })
    .eq('id', shareId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return rowToShare(data as DeckShareRow);
};

// Either side ──────────────────────────────────────────────────────
export const listMyDeckShares = async (): Promise<DeckShare[]> => {
  const { data: session } = await supabase.auth.getUser();
  const myId = session.user?.id;
  if (!myId) return [];
  const { data, error } = await supabase
    .from('deck_shares')
    .select('*')
    .or(`founder_id.eq.${myId},investor_id.eq.${myId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DeckShareRow[]).map(rowToShare);
};

// Mint a short-lived signed URL the investor can actually use to open the
// PDF. RLS already requires NDA signed + not revoked + not expired.
export const getDeckSignedUrl = async (
  filePath: string,
  ttlSeconds = 600,
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('decks')
    .createSignedUrl(filePath, ttlSeconds);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('No signed URL returned.');
  return data.signedUrl;
};
