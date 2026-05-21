import { create } from 'zustand';
import {
  SynergyCandidate,
  SynergyMatch,
  SwipeDirection,
  fetchSynergyCandidates,
  fetchMyMatches,
  swipeSynergy,
} from '../lib/sync/synergy';

// Phase 34 — Synergy Match store.
// Server-derived only, so nothing is persisted: candidates + matches are
// re-fetched when the screen opens and kept fresh by the realtime channel.

interface SynergyState {
  candidates: SynergyCandidate[];
  matches: SynergyMatch[];
  loadingCandidates: boolean;
  loadingMatches: boolean;
  loaded: boolean;
  error: string | null;

  loadCandidates: () => Promise<void>;
  loadMatches: () => Promise<void>;
  /** Records a swipe; resolves with the match result for the celebration UI. */
  swipe: (
    target: SynergyCandidate,
    direction: SwipeDirection,
  ) => Promise<{ matched: boolean }>;
  reset: () => void;
}

export const useSynergyStore = create<SynergyState>((set, get) => ({
  candidates: [],
  matches: [],
  loadingCandidates: false,
  loadingMatches: false,
  loaded: false,
  error: null,

  loadCandidates: async () => {
    set({ loadingCandidates: true, error: null });
    try {
      const candidates = await fetchSynergyCandidates();
      set({ candidates, loadingCandidates: false, loaded: true });
    } catch (err) {
      set({
        loadingCandidates: false,
        loaded: true,
        error: err instanceof Error ? err.message : 'Could not load matches.',
      });
    }
  },

  loadMatches: async () => {
    set({ loadingMatches: true });
    try {
      const matches = await fetchMyMatches();
      set({ matches, loadingMatches: false });
    } catch {
      set({ loadingMatches: false });
    }
  },

  swipe: async (target, direction) => {
    // Optimistically drop the candidate from the deck so the UI advances.
    const prev = get().candidates;
    set({ candidates: prev.filter((c) => c.id !== target.id) });
    try {
      const { matched } = await swipeSynergy(target.id, direction);
      if (matched) {
        // Pull the fresh match in for the Matches tab / badge.
        get().loadMatches();
      }
      return { matched };
    } catch (err) {
      // Roll the candidate back so the user can retry.
      set({ candidates: [target, ...get().candidates] });
      throw err;
    }
  },

  reset: () =>
    set({
      candidates: [],
      matches: [],
      loadingCandidates: false,
      loadingMatches: false,
      loaded: false,
      error: null,
    }),
}));
