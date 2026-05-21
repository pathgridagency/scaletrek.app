import { supabase } from '../supabase';
import { Deal, DealStage } from '../../data/mockData';

interface DealRow {
  id: string;
  investor_id: string;
  dreamer_id: string;
  post_id: string | null;
  stage: DealStage;
  amount: number | null;
  amount_currency: string | null;
  notes: string | null;
  updated_at: string;
}

const rowToDeal = (row: DealRow): Deal => ({
  id: row.id,
  investorId: row.investor_id,
  dreamerId: row.dreamer_id,
  postId: row.post_id ?? undefined,
  stage: row.stage,
  amount:
    row.amount != null
      ? `${row.amount_currency ?? ''}${row.amount.toLocaleString()}`.trim()
      : undefined,
  notes: row.notes ?? undefined,
  updatedAt: row.updated_at.slice(0, 10),
});

export const fetchDealsForUser = async (userId: string): Promise<Deal[]> => {
  const { data, error } = await supabase
    .from('deals')
    .select('id,investor_id,dreamer_id,post_id,stage,amount,amount_currency,notes,updated_at')
    .or(`investor_id.eq.${userId},dreamer_id.eq.${userId}`)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as DealRow[]).map(rowToDeal);
};

const parseMoney = (s?: string): { amount?: number; currency?: string } => {
  if (!s) return {};
  const match = s.match(/^([^\d.,-]*)([\d.,]+)/);
  if (!match) return {};
  const currency = match[1].trim() || undefined;
  const amount = parseFloat(match[2].replace(/,/g, ''));
  return { amount: Number.isFinite(amount) ? amount : undefined, currency };
};

export const insertDeal = async (deal: Omit<Deal, 'id' | 'updatedAt'>): Promise<Deal> => {
  const money = parseMoney(deal.amount);
  const row: Record<string, unknown> = {
    investor_id: deal.investorId,
    dreamer_id: deal.dreamerId,
    post_id: deal.postId ?? null,
    stage: deal.stage,
    notes: deal.notes ?? '',
  };
  if (money.amount !== undefined) {
    row.amount = money.amount;
    row.amount_currency = money.currency;
  }
  const { data, error } = await supabase
    .from('deals')
    .insert(row)
    .select('id,investor_id,dreamer_id,post_id,stage,amount,amount_currency,notes,updated_at')
    .single();
  if (error) throw error;
  return rowToDeal(data as DealRow);
};

export const updateDealStage = async (id: string, stage: DealStage): Promise<void> => {
  const { error } = await supabase.from('deals').update({ stage }).eq('id', id);
  if (error) throw error;
};

export const patchDeal = async (id: string, patch: Partial<Deal>): Promise<void> => {
  const row: Record<string, unknown> = {};
  if (patch.stage) row.stage = patch.stage;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.amount !== undefined) {
    const money = parseMoney(patch.amount);
    if (money.amount !== undefined) {
      row.amount = money.amount;
      row.amount_currency = money.currency;
    }
  }
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from('deals').update(row).eq('id', id);
  if (error) throw error;
};

export const deleteDeal = async (id: string): Promise<void> => {
  const { error } = await supabase.from('deals').delete().eq('id', id);
  if (error) throw error;
};
