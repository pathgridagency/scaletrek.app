import { create } from 'zustand';
import { persist } from '../storage/persist';
import { Notification, NotificationType } from '../data/mockData';
import {
  insertNotification,
  markNotificationsRead as markRemoteRead,
} from '../lib/sync/notifications';
import { sendPushTo } from '../lib/push';

interface NotificationsState {
  items: Notification[];
  push: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAllRead: (recipientId: string) => void;
  forUser: (recipientId: string) => Notification[];
  unreadCount: (recipientId: string) => number;
  _hasHydrated: boolean;
  _setHasHydrated: (v: boolean) => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist<NotificationsState>(
    (set, get) => ({
      items: [],
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      push: (n) => {
        const optimistic: Notification = {
          id: `n_local_${Date.now()}`,
          createdAt: 'just now',
          read: false,
          ...n,
        };
        set({ items: [optimistic, ...get().items] });
        insertNotification(n).catch((err) => {
          console.warn('[notifs] push sync failed:', err);
        });
        // Fire a real push to the recipient, but skip the self-targeted system
        // notifications (e.g. report-confirmation) — they're informational only.
        if (n.recipientId && n.type !== 'system') {
          sendPushTo(n.recipientId, n.message, {
            type: n.type,
            actorId: n.actorId,
            postId: n.postId,
          });
        }
      },

      markAllRead: (recipientId) => {
        set({
          items: get().items.map((n) =>
            n.recipientId === recipientId ? { ...n, read: true } : n,
          ),
        });
        markRemoteRead(recipientId).catch((err) =>
          console.warn('[notifs] markAllRead sync failed:', err),
        );
      },

      forUser: (recipientId) =>
        get().items.filter((n) => n.recipientId === recipientId),

      unreadCount: (recipientId) =>
        get().items.filter((n) => n.recipientId === recipientId && !n.read).length,
    }),
    { name: 'notifications', version: 2 },
  ),
);

export const notifyType = (t: NotificationType) => t;
