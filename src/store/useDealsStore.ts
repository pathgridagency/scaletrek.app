import { create } from 'zustand';
import { persist } from '../storage/persist';
import { Deal, DealStage } from '../data/mockData';
import {
  deleteDeal,
  insertDeal,
  patchDeal as patchDealRemote,
  updateDealStage,
} from '../lib/sync/deals';

interface DealsState {
  items: Deal[];
  add: (deal: Omit<Deal, 'id' | 'updatedAt'>) => Promise<Deal | null>;
  setStage: (id: string, stage: DealStage) => void;
  patch: (id: string, patch: Partial<Deal>) => void;
  remove: (id: string) => void;
  byInvestor: (investorId: string) => Deal[];
  _hasHydrated: boolean;
  _setHasHydrated: (v: boolean) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const useDealsStore = create<DealsState>()(
  persist<DealsState>(
    (set, get) => ({
      items: [],
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      add: async (deal) => {
        try {
          const created = await insertDeal(deal);
          set({ items: [created, ...get().items] });
          return created;
        } catch (err) {
          console.warn('[deals] add failed:', err);
          return null;
        }
      },

      setStage: (id, stage) => {
        set({
          items: get().items.map((d) => (d.id === id ? { ...d, stage, updatedAt: today() } : d)),
        });
        updateDealStage(id, stage).catch((err) =>
          console.warn('[deals] setStage sync failed:', err),
        );
      },

      patch: (id, patch) => {
        set({
          items: get().items.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: today() } : d)),
        });
        patchDealRemote(id, patch).catch((err) =>
          console.warn('[deals] patch sync failed:', err),
        );
      },

      remove: (id) => {
        set({ items: get().items.filter((d) => d.id !== id) });
        deleteDeal(id).catch((err) => console.warn('[deals] remove sync failed:', err));
      },

      byInvestor: (investorId) => get().items.filter((d) => d.investorId === investorId),
    }),
    { name: 'deals', version: 2 },
  ),
);
