import { supabase } from '../supabase';
import { FeedType, ShowcasePost, VerificationLevel } from '../../data/mockData';
import { insertPostMediaRows, parseMediaJson, UploadedMedia } from './media';

interface PostFeedRow {
  id: string;
  user_id: string;
  type: FeedType;
  milestone_title: string;
  description: string;
  tags: string[];
  media_type: 'image' | 'video' | 'metric';
  media_url: string | null;
  metric_label: string | null;
  metric_value: string | null;
  metric_unit: string | null;
  momentum_score: number;
  likes: number;
  comments_count: number;
  signals: number;
  risk_score: number;
  reward_score: number;
  industry: string;
  funding_goal_amount: number | null;
  funding_goal_currency: string | null;
  current_funding_amount: number | null;
  current_funding_currency: string | null;
  removed: boolean;
  status: 'pending' | 'approved' | 'rejected';
  moderation_reason: string | null;
  created_at: string;
  user_name: string;
  username: string;
  user_avatar: string;
  verification_level: VerificationLevel;
  media: unknown;
}

const formatAmount = (n: number | null, ccy: string | null) =>
  n == null ? undefined : `${ccy ?? ''}${n.toLocaleString()}`.trim();

const rowToPost = (row: PostFeedRow): ShowcasePost => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  userAvatar: row.user_avatar,
  verificationLevel: row.verification_level,
  type: row.type,
  milestoneTitle: row.milestone_title,
  description: row.description,
  tags: row.tags ?? [],
  mediaType: row.media_type,
  mediaUrl: row.media_url ?? undefined,
  media: parseMediaJson(row.media),
  metric:
    row.metric_label && row.metric_value
      ? {
          label: row.metric_label,
          value: row.metric_value,
          unit: row.metric_unit ?? undefined,
        }
      : undefined,
  momentumScore: row.momentum_score,
  likes: row.likes,
  comments: row.comments_count,
  signals: row.signals,
  riskScore: Number(row.risk_score),
  rewardScore: Number(row.reward_score),
  createdAt: new Date(row.created_at).toLocaleDateString(),
  createdAtMs: new Date(row.created_at).getTime(),
  industry: row.industry,
  fundingGoal: formatAmount(row.funding_goal_amount, row.funding_goal_currency),
  currentFunding: formatAmount(row.current_funding_amount, row.current_funding_currency),
  removed: row.removed,
  status: row.status,
  moderationReason: row.moderation_reason ?? undefined,
});

const POST_FEED_COLUMNS =
  'id,user_id,type,milestone_title,description,tags,media_type,media_url,metric_label,metric_value,metric_unit,momentum_score,likes,comments_count,signals,risk_score,reward_score,industry,funding_goal_amount,funding_goal_currency,current_funding_amount,current_funding_currency,removed,status,moderation_reason,created_at,user_name,username,user_avatar,verification_level,media';

export const fetchPosts = async (): Promise<ShowcasePost[]> => {
  const { data, error } = await supabase
    .from('post_feed')
    .select(POST_FEED_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as PostFeedRow[]).map(rowToPost);
};

export const fetchPendingRealityPosts = async (): Promise<ShowcasePost[]> => {
  const { data, error } = await supabase
    .from('post_feed')
    .select(POST_FEED_COLUMNS)
    .eq('type', 'reality')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as PostFeedRow[]).map(rowToPost);
};

export const approvePostRemote = async (postId: string): Promise<void> => {
  const { error } = await supabase.rpc('approve_post', { post_id: postId });
  if (error) throw error;
};

export const rejectPostRemote = async (postId: string, reason?: string): Promise<void> => {
  const { error } = await supabase.rpc('reject_post', { post_id: postId, reason: reason ?? null });
  if (error) throw error;
};

export interface CreatePostRow {
  user_id: string;
  type: FeedType;
  milestone_title: string;
  description: string;
  tags: string[];
  industry: string;
  media_type?: 'image' | 'video' | 'metric';
  media_url?: string;
  metric_label?: string;
  metric_value?: string;
  metric_unit?: string;
  risk_score?: number;
  reward_score?: number;
  funding_goal_amount?: number;
  funding_goal_currency?: string;
  current_funding_amount?: number;
  current_funding_currency?: string;
}

const parseMoney = (
  s?: string,
): { amount?: number; currency?: string } => {
  if (!s) return {};
  const match = s.match(/^([^\d.,-]*)([\d.,]+)/);
  if (!match) return {};
  const currency = match[1].trim() || undefined;
  const amount = parseFloat(match[2].replace(/,/g, ''));
  return { amount: Number.isFinite(amount) ? amount : undefined, currency };
};

export const createPost = async (
  input: CreatePostRow,
  media: UploadedMedia[] = [],
): Promise<ShowcasePost> => {
  const { data, error } = await supabase
    .from('posts')
    .insert(input)
    .select('id,user_id')
    .single();
  if (error) throw error;
  const postId = (data as { id: string; user_id: string }).id;
  const userId = (data as { id: string; user_id: string }).user_id;

  if (media.length > 0) {
    try {
      await insertPostMediaRows(postId, userId, media);
    } catch (mediaErr) {
      // Best-effort: keep the post even if the media rows fail (the storage
      // objects are already uploaded; the user can retry).
      console.warn('[posts] insertPostMediaRows failed:', mediaErr);
    }
  }

  // Fetch the joined view row so we have user_name etc.
  const { data: viewRow, error: viewErr } = await supabase
    .from('post_feed')
    .select(POST_FEED_COLUMNS)
    .eq('id', postId)
    .single();
  if (viewErr) throw viewErr;
  return rowToPost(viewRow as PostFeedRow);
};

export const buildCreatePostRow = (params: {
  userId: string;
  type: FeedType;
  milestoneTitle: string;
  description: string;
  tags: string[];
  industry: string;
  metric?: { label: string; value: string; unit?: string };
  fundingGoal?: string;
  currentFunding?: string;
  riskScore?: number;
  rewardScore?: number;
  mediaType?: 'image' | 'video' | 'metric';
  mediaUrl?: string;
}): CreatePostRow => {
  const funding = parseMoney(params.fundingGoal);
  const current = parseMoney(params.currentFunding);
  const row: CreatePostRow = {
    user_id: params.userId,
    type: params.type,
    milestone_title: params.milestoneTitle,
    description: params.description,
    tags: params.tags,
    industry: params.industry,
  };
  if (params.metric) {
    row.media_type = 'metric';
    row.metric_label = params.metric.label;
    row.metric_value = params.metric.value;
    if (params.metric.unit) row.metric_unit = params.metric.unit;
  }
  if (params.mediaUrl) {
    row.media_type = params.mediaType ?? 'image';
    row.media_url = params.mediaUrl;
  }
  if (params.riskScore !== undefined) row.risk_score = params.riskScore;
  if (params.rewardScore !== undefined) row.reward_score = params.rewardScore;
  if (funding.amount !== undefined) {
    row.funding_goal_amount = funding.amount;
    row.funding_goal_currency = funding.currency;
  }
  if (current.amount !== undefined) {
    row.current_funding_amount = current.amount;
    row.current_funding_currency = current.currency;
  }
  return row;
};

export const setPostRemoved = async (id: string, removed: boolean): Promise<void> => {
  const { error } = await supabase.from('posts').update({ removed }).eq('id', id);
  if (error) throw error;
};

export const togglePostLike = async (postId: string, userId: string, liked: boolean): Promise<void> => {
  if (liked) {
    const { error } = await supabase.from('post_likes').delete().match({ post_id: postId, user_id: userId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });
    if (error && error.code !== '23505') throw error; // 23505 = already liked
  }
};

export const togglePostSignal = async (postId: string, userId: string, signaled: boolean): Promise<void> => {
  if (signaled) {
    const { error } = await supabase.from('post_signals').delete().match({ post_id: postId, user_id: userId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('post_signals')
      .insert({ post_id: postId, user_id: userId });
    if (error && error.code !== '23505') throw error;
  }
};

export const fetchMyEngagement = async (
  userId: string,
): Promise<{ likedIds: Set<string>; signaledIds: Set<string> }> => {
  const [likes, signals] = await Promise.all([
    supabase.from('post_likes').select('post_id').eq('user_id', userId),
    supabase.from('post_signals').select('post_id').eq('user_id', userId),
  ]);
  if (likes.error) throw likes.error;
  if (signals.error) throw signals.error;
  return {
    likedIds: new Set((likes.data as { post_id: string }[]).map((r) => r.post_id)),
    signaledIds: new Set((signals.data as { post_id: string }[]).map((r) => r.post_id)),
  };
};
