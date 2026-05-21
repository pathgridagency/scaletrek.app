import { supabase } from '../supabase';
import { UserRole, VerificationLevel } from '../../data/mockData';

// Phase 34 — Synergy Match sync layer.
// A complementary-founder matching portal. Candidates and matches both come
// straight from the DB (the `synergy_candidates` RPC + `synergy_match_feed`
// view), so no client-side scoring is needed.

export type SwipeDirection = 'interested' | 'pass';

export interface SynergyCandidate {
  id: string;
  name: string;
  username: string;
  avatar: string;
  avatarUrl?: string;
  role: UserRole;
  headline?: string;
  industry?: string;
  companyName?: string;
  bio?: string;
  verificationLevel: VerificationLevel;
  strengths: string[];
  bottlenecks: string[];
  hoursPerWeek?: number;
  equityExpectation?: string;
  /** How many of MY bottlenecks this candidate can solve. */
  mineSolved: number;
  /** How many of THEIR bottlenecks I can solve. */
  theirsSolved: number;
  /** 0-100 mutual synergy score. */
  synergyScore: number;
}

export interface SynergyMatch {
  id: string;
  status: 'pending' | 'matched' | 'rejected';
  synergyScore: number;
  createdAt: string;
  partnerId: string;
  partnerName: string;
  partnerUsername: string;
  partnerAvatar: string;
  partnerAvatarUrl?: string;
  partnerRole: UserRole;
  partnerHeadline?: string;
  partnerIndustry?: string;
  partnerCompany?: string;
  partnerVerification: VerificationLevel;
  partnerStrengths: string[];
  partnerBottlenecks: string[];
  partnerHours?: number;
  partnerEquity?: string;
}

interface CandidateRow {
  id: string;
  name: string;
  username: string;
  avatar: string;
  avatar_url: string | null;
  role: UserRole;
  headline: string | null;
  industry: string | null;
  company_name: string | null;
  bio: string | null;
  verification_level: VerificationLevel;
  strengths: string[] | null;
  bottlenecks: string[] | null;
  synergy_hours_per_week: number | null;
  synergy_equity_expectation: string | null;
  mine_solved: number;
  theirs_solved: number;
  synergy_score: number;
}

interface MatchRow {
  id: string;
  status: 'pending' | 'matched' | 'rejected';
  synergy_score: number;
  created_at: string;
  partner_id: string;
  partner_name: string;
  partner_username: string;
  partner_avatar: string;
  partner_avatar_url: string | null;
  partner_role: UserRole;
  partner_headline: string | null;
  partner_industry: string | null;
  partner_company: string | null;
  partner_verification: VerificationLevel;
  partner_strengths: string[] | null;
  partner_bottlenecks: string[] | null;
  partner_hours: number | null;
  partner_equity: string | null;
}

const rowToCandidate = (r: CandidateRow): SynergyCandidate => ({
  id: r.id,
  name: r.name,
  username: r.username,
  avatar: r.avatar,
  avatarUrl: r.avatar_url ?? undefined,
  role: r.role,
  headline: r.headline ?? undefined,
  industry: r.industry ?? undefined,
  companyName: r.company_name ?? undefined,
  bio: r.bio ?? undefined,
  verificationLevel: r.verification_level,
  strengths: r.strengths ?? [],
  bottlenecks: r.bottlenecks ?? [],
  hoursPerWeek: r.synergy_hours_per_week ?? undefined,
  equityExpectation: r.synergy_equity_expectation ?? undefined,
  mineSolved: r.mine_solved,
  theirsSolved: r.theirs_solved,
  synergyScore: r.synergy_score,
});

const rowToMatch = (r: MatchRow): SynergyMatch => ({
  id: r.id,
  status: r.status,
  synergyScore: r.synergy_score,
  createdAt: r.created_at,
  partnerId: r.partner_id,
  partnerName: r.partner_name,
  partnerUsername: r.partner_username,
  partnerAvatar: r.partner_avatar,
  partnerAvatarUrl: r.partner_avatar_url ?? undefined,
  partnerRole: r.partner_role,
  partnerHeadline: r.partner_headline ?? undefined,
  partnerIndustry: r.partner_industry ?? undefined,
  partnerCompany: r.partner_company ?? undefined,
  partnerVerification: r.partner_verification,
  partnerStrengths: r.partner_strengths ?? [],
  partnerBottlenecks: r.partner_bottlenecks ?? [],
  partnerHours: r.partner_hours ?? undefined,
  partnerEquity: r.partner_equity ?? undefined,
});

/** Ranked complementary-founder candidates for the current user. */
export const fetchSynergyCandidates = async (): Promise<SynergyCandidate[]> => {
  const { data, error } = await supabase.rpc('synergy_candidates');
  if (error) throw error;
  return ((data as CandidateRow[]) ?? []).map(rowToCandidate);
};

/** All of the current user's partnership matches, newest first. */
export const fetchMyMatches = async (): Promise<SynergyMatch[]> => {
  const { data, error } = await supabase
    .from('synergy_match_feed')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as MatchRow[]) ?? []).map(rowToMatch);
};

/**
 * Record a swipe. Returns whether it produced a mutual match (both sides
 * interested) plus the match id when it did.
 */
export const swipeSynergy = async (
  targetId: string,
  direction: SwipeDirection,
): Promise<{ matched: boolean; matchId: string | null }> => {
  const { data, error } = await supabase.rpc('synergy_swipe', {
    target: targetId,
    dir: direction,
  });
  if (error) throw error;
  const result = (data ?? {}) as { matched?: boolean; match_id?: string | null };
  return { matched: result.matched === true, matchId: result.match_id ?? null };
};
