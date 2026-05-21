import { supabase } from '../supabase';
import { ChatMessage, ChatThread, DealStage } from '../../data/mockData';
import { rowToUser } from './profiles';

interface ThreadRow {
  id: string;
  user_a: string;
  user_b: string;
  deal_stage: DealStage;
  last_message: string | null;
  last_time: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  ciphertext: string;
  nonce: string | null;
  encrypted: boolean;
  read_by: string[] | null;
  created_at: string;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m} ${ampm}`;
};

const sortPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

export const fetchThreadsForUser = async (
  userId: string,
): Promise<ChatThread[]> => {
  const { data: threadsData, error: threadsErr } = await supabase
    .from('threads')
    .select('id,user_a,user_b,deal_stage,last_message,last_time,created_at')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('last_time', { ascending: false });
  if (threadsErr) throw threadsErr;
  const threads = threadsData as ThreadRow[];
  if (threads.length === 0) return [];

  const peerIds = Array.from(
    new Set(threads.map((t) => (t.user_a === userId ? t.user_b : t.user_a))),
  );
  const { data: peers, error: peersErr } = await supabase
    .from('public_profiles')
    .select(
      'id,name,username,avatar,role,bio,industry,momentum_score,verification_level,followers,following,showcase_count,suspended,preferred_currency,preferred_language,public_key,joined_at,reveal_to_all,identity_revealed',
    )
    .in('id', peerIds);
  if (peersErr) throw peersErr;
  const peerById = new Map((peers as any[]).map((p) => [p.id as string, rowToUser(p)]));

  const threadIds = threads.map((t) => t.id);
  const { data: msgs, error: msgsErr } = await supabase
    .from('messages')
    .select('id,thread_id,sender_id,ciphertext,nonce,encrypted,read_by,created_at')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: true });
  if (msgsErr) throw msgsErr;
  const messagesByThread = new Map<string, ChatMessage[]>();
  for (const m of msgs as MessageRow[]) {
    const peerId = (() => {
      const t = threads.find((x) => x.id === m.thread_id);
      return t ? (t.user_a === m.sender_id ? t.user_b : t.user_a) : undefined;
    })();
    const senderName =
      m.sender_id === userId
        ? 'You'
        : (peerById.get(m.sender_id)?.name ?? peerById.get(peerId ?? '')?.name ?? 'Unknown');
    const mapped: ChatMessage = {
      id: m.id,
      senderId: m.sender_id,
      senderName,
      content: m.ciphertext,
      nonce: m.nonce ?? undefined,
      timestamp: formatTime(m.created_at),
      encrypted: m.encrypted,
      read: (m.read_by ?? []).includes(userId),
    };
    if (!messagesByThread.has(m.thread_id)) messagesByThread.set(m.thread_id, []);
    messagesByThread.get(m.thread_id)!.push(mapped);
  }

  return threads.map((t) => {
    const peerId = t.user_a === userId ? t.user_b : t.user_a;
    const peer = peerById.get(peerId);
    const tMsgs = messagesByThread.get(t.id) ?? [];
    const unread = tMsgs.filter((m) => !m.read && m.senderId !== userId).length;
    return {
      id: t.id,
      participantId: peerId,
      participantName: peer?.name ?? 'Unknown',
      participantAvatar: peer?.avatar ?? '??',
      lastMessage: t.last_message ?? '',
      lastTime: formatTime(t.last_time),
      unread,
      dealStatus: t.deal_stage,
      messages: tMsgs,
    };
  });
};

export const ensureThread = async (
  selfId: string,
  peerId: string,
): Promise<string> => {
  const [a, b] = sortPair(selfId, peerId);
  const { data: existing, error: findErr } = await supabase
    .from('threads')
    .select('id')
    .eq('user_a', a)
    .eq('user_b', b)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return (existing as { id: string }).id;
  const { data: created, error: createErr } = await supabase
    .from('threads')
    .insert({ user_a: a, user_b: b })
    .select('id')
    .single();
  if (createErr) throw createErr;
  return (created as { id: string }).id;
};

export interface SendMessageParams {
  threadId: string;
  senderId: string;
  content: string;
  nonce?: string;
  encrypted: boolean;
}

export const insertMessage = async (
  params: SendMessageParams,
): Promise<MessageRow> => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id: params.threadId,
      sender_id: params.senderId,
      ciphertext: params.content,
      nonce: params.nonce ?? null,
      encrypted: params.encrypted,
      read_by: [params.senderId],
    })
    .select('id,thread_id,sender_id,ciphertext,nonce,encrypted,read_by,created_at')
    .single();
  if (error) throw error;
  // Touch thread metadata so it sorts to top.
  await supabase
    .from('threads')
    .update({ last_message: params.content.slice(0, 200), last_time: new Date().toISOString() })
    .eq('id', params.threadId);
  return data as MessageRow;
};

export const updateThreadDealStage = async (
  threadId: string,
  stage: DealStage,
): Promise<void> => {
  const { error } = await supabase
    .from('threads')
    .update({ deal_stage: stage })
    .eq('id', threadId);
  if (error) throw error;
};

export const markThreadRead = async (
  threadId: string,
  userId: string,
): Promise<void> => {
  // Append the user to read_by for every unread message in this thread sent
  // by someone else. We use an RPC-free approach: fetch unread, patch each.
  const { data, error } = await supabase
    .from('messages')
    .select('id,read_by')
    .eq('thread_id', threadId)
    .neq('sender_id', userId);
  if (error) throw error;
  const updates = (data as { id: string; read_by: string[] | null }[])
    .filter((m) => !(m.read_by ?? []).includes(userId))
    .map((m) =>
      supabase
        .from('messages')
        .update({ read_by: [...(m.read_by ?? []), userId] })
        .eq('id', m.id),
    );
  await Promise.all(updates);
};
