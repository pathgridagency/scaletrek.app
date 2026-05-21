import { supabase } from '../supabase';

interface FollowRow {
  follower_id: string;
  followee_id: string;
}

export const fetchFollows = async (): Promise<Record<string, string[]>> => {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id,followee_id');
  if (error) throw error;
  const edges: Record<string, string[]> = {};
  for (const row of data as FollowRow[]) {
    if (!edges[row.follower_id]) edges[row.follower_id] = [];
    edges[row.follower_id].push(row.followee_id);
  }
  return edges;
};

export const insertFollow = async (followerId: string, followeeId: string): Promise<void> => {
  if (followerId === followeeId) return;
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, followee_id: followeeId });
  if (error && error.code !== '23505') throw error;
};

export const deleteFollow = async (followerId: string, followeeId: string): Promise<void> => {
  const { error } = await supabase
    .from('follows')
    .delete()
    .match({ follower_id: followerId, followee_id: followeeId });
  if (error) throw error;
};
