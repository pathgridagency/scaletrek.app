import { create } from 'zustand';
import { persist } from '../storage/persist';
import { Report, VerificationLevel, VerificationRequest } from '../data/mockData';
import {
  blockUser as blockUserSync,
  decideVerificationRow,
  insertReport,
  insertVerification,
  resolveReportRow,
  unblockUser as unblockUserSync,
} from '../lib/sync/moderation';

interface ModerationState {
  reports: Report[];
  verificationRequests: VerificationRequest[];
  blockedIds: string[];
  report: (postId: string, reporterId: string, reason: string) => void;
  resolveReport: (id: string, action: 'kept' | 'removed') => void;
  requestVerification: (userId: string, requestedLevel: VerificationLevel, evidence: string) => void;
  decideVerification: (id: string, status: 'approved' | 'rejected') => void;
  blockUser: (id: string, reason?: string) => Promise<void>;
  unblockUser: (id: string) => Promise<void>;
  isBlocked: (id: string) => boolean;
  pendingReports: () => Report[];
  pendingVerifications: () => VerificationRequest[];
  _hasHydrated: boolean;
  _setHasHydrated: (v: boolean) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const useModerationStore = create<ModerationState>()(
  persist<ModerationState>(
    (set, get) => ({
      reports: [],
      verificationRequests: [],
      blockedIds: [],
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      report: (postId, reporterId, reason) => {
        set({
          reports: [
            {
              id: `r_local_${Date.now()}`,
              postId,
              reporterId,
              reason,
              createdAt: today(),
              resolved: false,
            },
            ...get().reports,
          ],
        });
        insertReport(postId, reporterId, reason).catch((err) =>
          console.warn('[mod] report sync failed:', err),
        );
      },

      resolveReport: (id, action) => {
        set({
          reports: get().reports.map((r) =>
            r.id === id ? { ...r, resolved: true, action } : r,
          ),
        });
        if (!id.startsWith('r_local_')) {
          resolveReportRow(id, action).catch((err) =>
            console.warn('[mod] resolveReport sync failed:', err),
          );
        }
      },

      requestVerification: (userId, requestedLevel, evidence) => {
        set({
          verificationRequests: [
            {
              id: `vr_local_${Date.now()}`,
              userId,
              requestedLevel,
              evidence,
              createdAt: today(),
              status: 'pending',
            },
            ...get().verificationRequests,
          ],
        });
        insertVerification(userId, requestedLevel, evidence).catch((err) =>
          console.warn('[mod] requestVerification sync failed:', err),
        );
      },

      decideVerification: (id, status) => {
        set({
          verificationRequests: get().verificationRequests.map((r) =>
            r.id === id ? { ...r, status } : r,
          ),
        });
        if (!id.startsWith('vr_local_')) {
          decideVerificationRow(id, status).catch((err) =>
            console.warn('[mod] decideVerification sync failed:', err),
          );
        }
      },

      blockUser: async (id, reason) => {
        if (get().blockedIds.includes(id)) return;
        set({ blockedIds: [...get().blockedIds, id] });
        try {
          await blockUserSync(id, reason);
        } catch (err) {
          set({ blockedIds: get().blockedIds.filter((x) => x !== id) });
          throw err;
        }
      },

      unblockUser: async (id) => {
        const previous = get().blockedIds;
        if (!previous.includes(id)) return;
        set({ blockedIds: previous.filter((x) => x !== id) });
        try {
          await unblockUserSync(id);
        } catch (err) {
          set({ blockedIds: previous });
          throw err;
        }
      },

      isBlocked: (id) => get().blockedIds.includes(id),

      pendingReports: () => get().reports.filter((r) => !r.resolved),
      pendingVerifications: () =>
        get().verificationRequests.filter((r) => r.status === 'pending'),
    }),
    { name: 'moderation', version: 2 },
  ),
);
