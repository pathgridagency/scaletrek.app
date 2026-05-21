import { supabase } from '../supabase';
import { Notification, NotificationType } from '../../data/mockData';

interface NotificationRow {
  id: string;
  recipient_id: string;
  type: NotificationType;
  actor_id: string | null;
  post_id: string | null;
  thread_id: string | null;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  actor_name?: string;
  actor_avatar?: string;
}

const rowToNotification = (row: NotificationRow): Notification => ({
  id: row.id,
  recipientId: row.recipient_id,
  type: row.type,
  actorId: row.actor_id ?? undefined,
  actorName: row.actor_name,
  actorAvatar: row.actor_avatar,
  postId: row.post_id ?? undefined,
  message: row.message,
  createdAt: new Date(row.created_at).toLocaleString(),
  read: row.read,
});

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id,recipient_id,type,actor_id,post_id,thread_id,message,link,read,created_at',
    )
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = data as NotificationRow[];
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_id).filter((id): id is string => !!id)),
  );
  if (actorIds.length === 0) return rows.map(rowToNotification);
  const { data: actors, error: actorsErr } = await supabase
    .from('public_profiles')
    .select('id,name,avatar')
    .in('id', actorIds);
  if (actorsErr) throw actorsErr;
  const actorMap = new Map(
    (actors as { id: string; name: string; avatar: string }[]).map((a) => [a.id, a]),
  );
  return rows.map((r) => {
    const actor = r.actor_id ? actorMap.get(r.actor_id) : undefined;
    return rowToNotification({
      ...r,
      actor_name: actor?.name,
      actor_avatar: actor?.avatar,
    });
  });
};

export const insertNotification = async (
  n: Omit<Notification, 'id' | 'createdAt' | 'read'>,
): Promise<void> => {
  const { error } = await supabase.from('notifications').insert({
    recipient_id: n.recipientId,
    type: n.type,
    actor_id: n.actorId ?? null,
    post_id: n.postId ?? null,
    message: n.message,
  });
  if (error) throw error;
};

export const markNotificationsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('recipient_id', userId)
    .eq('read', false);
  if (error) throw error;
};
