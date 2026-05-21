import { supabase } from '../supabase';

// Phase 27 — Trending tags (free for everyone).

export interface TrendingTag {
  tag: string;
  postCount: number;
  authorCount: number;
  rank: number;
}

export const fetchTrendingTags = async (limit = 12): Promise<TrendingTag[]> => {
  const { data, error } = await supabase
    .from('trending_tags')
    .select('tag,post_count,author_count,rank')
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    tag: r.tag,
    postCount: r.post_count,
    authorCount: r.author_count,
    rank: r.rank,
  }));
};
