import { supabase } from '../supabase';
import { Report, VerificationLevel, VerificationRequest } from '../../data/mockData';

interface ReportRow {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  resolved: boolean;
  action: 'kept' | 'removed' | null;
  created_at: string;
}

interface VerifRow {
  id: string;
  user_id: string;
  requested_level: VerificationLevel;
  evidence: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const rowToReport = (row: ReportRow): Report => ({
  id: row.id,
  postId: row.post_id,
  reporterId: row.reporter_id,
  reason: row.reason,
  createdAt: row.created_at.slice(0, 10),
  resolved: row.resolved,
  action: row.action ?? undefined,
});

const rowToVerif = (row: VerifRow): VerificationRequest => ({
  id: row.id,
  userId: row.user_id,
  requestedLevel: row.requested_level,
  evidence: row.evidence,
  createdAt: row.created_at.slice(0, 10),
  status: row.status,
});

export const fetchReports = async (): Promise<Report[]> => {
  const { data, error } = await supabase
    .from('reports')
    .select('id,post_id,reporter_id,reason,resolved,action,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ReportRow[]).map(rowToReport);
};

export const fetchVerificationRequests = async (): Promise<VerificationRequest[]> => {
  const { data, error } = await supabase
    .from('verification_requests')
    .select('id,user_id,requested_level,evidence,status,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as VerifRow[]).map(rowToVerif);
};

export const insertReport = async (
  postId: string,
  reporterId: string,
  reason: string,
): Promise<void> => {
  const { error } = await supabase
    .from('reports')
    .insert({ post_id: postId, reporter_id: reporterId, reason });
  if (error) throw error;
};

export const resolveReportRow = async (
  id: string,
  action: 'kept' | 'removed',
): Promise<void> => {
  const { error } = await supabase
    .from('reports')
    .update({ resolved: true, action })
    .eq('id', id);
  if (error) throw error;
};

export const insertVerification = async (
  userId: string,
  requestedLevel: VerificationLevel,
  evidence: string,
): Promise<void> => {
  const { error } = await supabase.from('verification_requests').insert({
    user_id: userId,
    requested_level: requestedLevel,
    evidence,
  });
  if (error) throw error;
};

export const decideVerificationRow = async (
  id: string,
  status: 'approved' | 'rejected',
): Promise<void> => {
  const { error } = await supabase
    .from('verification_requests')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
};

// ─────────────────────────── blocks ───────────────────────────
export const fetchMyBlocks = async (): Promise<string[]> => {
  const { data: session } = await supabase.auth.getUser();
  const myId = session.user?.id;
  if (!myId) return [];
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', myId);
  if (error) throw error;
  return (data ?? []).map((r) => r.blocked_id as string);
};

export const blockUser = async (
  blockedId: string,
  reason = '',
): Promise<void> => {
  const { data: session } = await supabase.auth.getUser();
  const myId = session.user?.id;
  if (!myId) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('blocks')
    .upsert(
      { blocker_id: myId, blocked_id: blockedId, reason },
      { onConflict: 'blocker_id,blocked_id' },
    );
  if (error) throw error;
};

export const unblockUser = async (blockedId: string): Promise<void> => {
  const { data: session } = await supabase.auth.getUser();
  const myId = session.user?.id;
  if (!myId) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', myId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
};
