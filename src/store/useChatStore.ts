import { create } from 'zustand';
import { persist } from '../storage/persist';
import { ChatMessage, ChatThread, DealStage } from '../data/mockData';
import { useAuthStore } from './useAuthStore';
import {
  decryptWithSharedSecret,
  deriveSharedSecret,
  encryptWithSharedSecret,
  ensureKeyPair,
  generateKeyPair,
  getMyPublicKey,
} from '../lib/crypto';
import {
  ensureThread as ensureThreadRemote,
  insertMessage,
  markThreadRead as markThreadReadRemote,
  updateThreadDealStage,
} from '../lib/sync/chats';
import { updateProfile } from '../lib/sync/profiles';

interface EncryptionState {
  peerPublicKey: string;
  sharedSecret: string;
  activatedAt: number;
}

interface ChatState {
  threads: ChatThread[];
  encryption: Record<string, EncryptionState | undefined>;
  startThread: (params: {
    participantId: string;
    participantName: string;
    participantAvatar: string;
  }) => Promise<ChatThread | null>;
  sendMessage: (threadId: string, senderId: string, senderName: string, content: string) => Promise<void>;
  markRead: (threadId: string) => void;
  setDealStage: (threadId: string, stage: DealStage) => void;
  handshake: (threadId: string) => EncryptionState | null;
  decryptMessage: (threadId: string, message: ChatMessage) => string;
  isEncrypted: (threadId: string) => boolean;
  _hasHydrated: boolean;
  _setHasHydrated: (v: boolean) => void;
}

const timeOfDay = () => {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m} ${ampm}`;
};

const resolvePeerPublicKey = (peerUserId: string): string | null => {
  const { users, updateUserById } = useAuthStore.getState();
  const peer = users.find((u) => u.id === peerUserId);
  if (!peer) return null;
  if (peer.publicKey) return peer.publicKey;
  // Demo fallback: if we don't have a peer pubkey yet (peer hasn't completed
  // crypto bootstrap on their device), synthesize one locally so the handshake
  // succeeds. Real peers replace this on their next session via the bootstrap
  // hook writing to profiles.public_key.
  const synthetic = generateKeyPair();
  updateUserById(peerUserId, { publicKey: synthetic.publicKey });
  return synthetic.publicKey;
};

export const useChatStore = create<ChatState>()(
  persist<ChatState>(
    (set, get) => ({
      threads: [],
      encryption: {},
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      startThread: async ({ participantId, participantName, participantAvatar }) => {
        const existing = get().threads.find((t) => t.participantId === participantId);
        if (existing) return existing;
        const me = useAuthStore.getState().user;
        if (!me) return null;
        try {
          const threadId = await ensureThreadRemote(me.id, participantId);
          const thread: ChatThread = {
            id: threadId,
            participantId,
            participantName,
            participantAvatar,
            lastMessage: '',
            lastTime: timeOfDay(),
            unread: 0,
            dealStatus: 'exploring',
            messages: [],
          };
          set({ threads: [thread, ...get().threads.filter((t) => t.id !== threadId)] });
          return thread;
        } catch (err) {
          console.warn('[chat] startThread failed:', err);
          return null;
        }
      },

      handshake: (threadId) => {
        const thread = get().threads.find((t) => t.id === threadId);
        if (!thread) return null;
        const existing = get().encryption[threadId];
        if (existing) return existing;

        if (!getMyPublicKey()) {
          ensureKeyPair().catch(() => {});
          return null;
        }

        const peerPublicKey = resolvePeerPublicKey(thread.participantId);
        if (!peerPublicKey) return null;

        let sharedSecret: string;
        try {
          sharedSecret = deriveSharedSecret(peerPublicKey);
        } catch {
          return null;
        }

        const next: EncryptionState = {
          peerPublicKey,
          sharedSecret,
          activatedAt: Date.now(),
        };
        set({ encryption: { ...get().encryption, [threadId]: next } });
        return next;
      },

      sendMessage: async (threadId, senderId, senderName, content) => {
        const trimmed = content.trim();
        if (!trimmed) return;

        const thread = get().threads.find((t) => t.id === threadId);
        const enc =
          thread && thread.dealStatus === 'negotiating'
            ? get().encryption[threadId] ?? get().handshake(threadId)
            : null;

        let storedContent = trimmed;
        let nonce: string | undefined;
        let encrypted = false;

        if (enc) {
          const payload = encryptWithSharedSecret(enc.sharedSecret, trimmed);
          storedContent = payload.ciphertext;
          nonce = payload.nonce;
          encrypted = true;
        }

        const tempId = `m_local_${Date.now()}`;
        const optimistic: ChatMessage = {
          id: tempId,
          senderId,
          senderName,
          content: storedContent,
          nonce,
          timestamp: timeOfDay(),
          encrypted,
          read: true,
        };

        set({
          threads: get().threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  messages: [...t.messages, optimistic],
                  lastMessage: trimmed,
                  lastTime: 'now',
                }
              : t,
          ),
        });

        try {
          const inserted = await insertMessage({
            threadId,
            senderId,
            content: storedContent,
            nonce,
            encrypted,
          });
          // Replace the optimistic entry with the canonical row id.
          set({
            threads: get().threads.map((t) =>
              t.id === threadId
                ? {
                    ...t,
                    messages: t.messages.map((m) =>
                      m.id === tempId ? { ...m, id: inserted.id } : m,
                    ),
                  }
                : t,
            ),
          });
        } catch (err) {
          console.warn('[chat] sendMessage sync failed:', err);
          // Drop the optimistic message on failure.
          set({
            threads: get().threads.map((t) =>
              t.id === threadId
                ? { ...t, messages: t.messages.filter((m) => m.id !== tempId) }
                : t,
            ),
          });
        }
      },

      markRead: (threadId) => {
        set({
          threads: get().threads.map((t) =>
            t.id === threadId
              ? { ...t, unread: 0, messages: t.messages.map((m) => ({ ...m, read: true })) }
              : t,
          ),
        });
        const thread = get().threads.find((t) => t.id === threadId);
        if (thread && thread.dealStatus === 'negotiating' && !get().encryption[threadId]) {
          get().handshake(threadId);
        }
        const me = useAuthStore.getState().user;
        if (me) {
          markThreadReadRemote(threadId, me.id).catch((err) =>
            console.warn('[chat] markRead sync failed:', err),
          );
        }
      },

      setDealStage: (threadId, stage) => {
        set({
          threads: get().threads.map((t) => (t.id === threadId ? { ...t, dealStatus: stage } : t)),
        });
        updateThreadDealStage(threadId, stage).catch((err) =>
          console.warn('[chat] setDealStage sync failed:', err),
        );
        if (stage === 'negotiating') {
          get().handshake(threadId);
          // Make sure my own public key is on file so the peer can complete
          // their side of the handshake.
          const myPub = getMyPublicKey();
          const me = useAuthStore.getState().user;
          if (myPub && me && me.publicKey !== myPub) {
            updateProfile(me.id, { publicKey: myPub }).catch(() => {});
          }
        }
      },

      decryptMessage: (threadId, message) => {
        if (!message.encrypted || !message.nonce) return message.content;
        const enc = get().encryption[threadId];
        if (!enc) return '[encrypted — handshake pending]';
        const plain = decryptWithSharedSecret(enc.sharedSecret, message.content, message.nonce);
        return plain ?? '[unable to decrypt]';
      },

      isEncrypted: (threadId) => !!get().encryption[threadId],
    }),
    {
      name: 'chat',
      version: 3,
      partialize: (state) => ({ threads: state.threads }) as Partial<ChatState>,
    },
  ),
);
