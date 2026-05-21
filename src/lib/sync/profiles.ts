import { supabase } from '../supabase';
import { User, UserRole, VerificationLevel } from '../../data/mockData';

interface ProfileRow {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: UserRole;
  bio: string | null;
  industry: string | null;
  momentum_score: number;
  verification_level: VerificationLevel;
  followers: number;
  following: number;
  showcase_count: number;
  suspended: boolean;
  preferred_currency: string;
  preferred_language: string;
  public_key: string | null;
  joined_at: string;
  reveal_to_all?: boolean | null;
  identity_revealed?: boolean | null;
  profile_complete?: boolean | null;
  onboarded?: boolean | null;
  is_pro?: boolean | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  headline?: string | null;
  location?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  github_url?: string | null;
  facebook_url?: string | null;
  company_name?: string | null;
  sector?: string | null;
  founded_year?: number | null;
  team_size?: string | null;
}

const VIEW_COLUMNS =
  'id,name,username,avatar,role,bio,industry,momentum_score,verification_level,followers,following,showcase_count,suspended,preferred_currency,preferred_language,public_key,joined_at,reveal_to_all,identity_revealed,profile_complete,onboarded,is_pro,avatar_url,cover_url,headline,location,website,linkedin_url,twitter_url,instagram_url,github_url,facebook_url,company_name,sector,founded_year,team_size';

export const rowToUser = (row: ProfileRow): User => ({
  id: row.id,
  name: row.name,
  username: row.username,
  avatar: row.avatar,
  role: row.role,
  bio: row.bio ?? '',
  industry: row.industry ?? undefined,
  momentumScore: row.momentum_score,
  verificationLevel: row.verification_level,
  followers: row.followers,
  following: row.following,
  showcaseCount: row.showcase_count,
  suspended: row.suspended,
  publicKey: row.public_key ?? undefined,
  joinedAt: row.joined_at,
  identityRevealed: row.identity_revealed ?? true,
  revealToAll: row.reveal_to_all ?? false,
  profileComplete: row.profile_complete ?? true,
  onboarded: row.onboarded ?? false,
  isPro: row.is_pro ?? false,
  avatarUrl: row.avatar_url ?? undefined,
  coverUrl: row.cover_url ?? undefined,
  headline: row.headline ?? undefined,
  location: row.location ?? undefined,
  website: row.website ?? undefined,
  linkedinUrl: row.linkedin_url ?? undefined,
  twitterUrl: row.twitter_url ?? undefined,
  instagramUrl: row.instagram_url ?? undefined,
  githubUrl: row.github_url ?? undefined,
  facebookUrl: row.facebook_url ?? undefined,
  companyName: row.company_name ?? undefined,
  sector: row.sector ?? undefined,
  foundedYear: row.founded_year ?? undefined,
  teamSize: row.team_size ?? undefined,
});

export const fetchAllProfiles = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('public_profiles')
    .select(VIEW_COLUMNS)
    .order('momentum_score', { ascending: false });
  if (error) throw error;
  return (data as ProfileRow[]).map(rowToUser);
};

export const fetchProfile = async (id: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('public_profiles')
    .select(VIEW_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToUser(data as ProfileRow) : null;
};

const userPatchToRow = (patch: Partial<User>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.username !== undefined) out.username = patch.username;
  if (patch.avatar !== undefined) out.avatar = patch.avatar;
  if (patch.bio !== undefined) out.bio = patch.bio;
  if (patch.industry !== undefined) out.industry = patch.industry;
  if (patch.role !== undefined) out.role = patch.role;
  if (patch.momentumScore !== undefined) out.momentum_score = patch.momentumScore;
  if (patch.verificationLevel !== undefined) out.verification_level = patch.verificationLevel;
  if (patch.suspended !== undefined) out.suspended = patch.suspended;
  if (patch.publicKey !== undefined) out.public_key = patch.publicKey;
  if (patch.revealToAll !== undefined) out.reveal_to_all = patch.revealToAll;
  if (patch.profileComplete !== undefined) out.profile_complete = patch.profileComplete;
  if (patch.onboarded !== undefined) out.onboarded = patch.onboarded;
  if (patch.avatarUrl !== undefined) out.avatar_url = patch.avatarUrl;
  if (patch.coverUrl !== undefined) out.cover_url = patch.coverUrl;
  if (patch.headline !== undefined) out.headline = patch.headline;
  if (patch.location !== undefined) out.location = patch.location;
  if (patch.website !== undefined) out.website = patch.website;
  if (patch.linkedinUrl !== undefined) out.linkedin_url = patch.linkedinUrl;
  if (patch.twitterUrl !== undefined) out.twitter_url = patch.twitterUrl;
  if (patch.instagramUrl !== undefined) out.instagram_url = patch.instagramUrl;
  if (patch.githubUrl !== undefined) out.github_url = patch.githubUrl;
  if (patch.facebookUrl !== undefined) out.facebook_url = patch.facebookUrl;
  if (patch.companyName !== undefined) out.company_name = patch.companyName;
  if (patch.sector !== undefined) out.sector = patch.sector;
  if (patch.foundedYear !== undefined) out.founded_year = patch.foundedYear;
  if (patch.teamSize !== undefined) out.team_size = patch.teamSize;
  return out;
};

export const updateProfile = async (id: string, patch: Partial<User>): Promise<void> => {
  const row = userPatchToRow(patch);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from('profiles').update(row).eq('id', id);
  if (error) throw error;
};

export const bulkUpdateMomentum = async (
  scores: Record<string, number>,
): Promise<void> => {
  const entries = Object.entries(scores);
  if (entries.length === 0) return;
  // RLS only allows users to update their own row, so this is best-effort: we
  // only push the local user's score. Other users' scores update when they
  // open the app themselves.
  const { data: session } = await supabase.auth.getUser();
  const meId = session.user?.id;
  if (!meId) return;
  const myScore = scores[meId];
  if (myScore === undefined) return;
  await supabase.from('profiles').update({ momentum_score: myScore }).eq('id', meId);
};
