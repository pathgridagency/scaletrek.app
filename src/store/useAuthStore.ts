import { create } from 'zustand';
import { persist } from '../storage/persist';
import { User, UserRole } from '../data/mockData';
import {
  signInWithPassword,
  signUpWithPassword,
  signOut as supabaseSignOut,
  EmailConfirmationRequired,
  SignupParams,
} from '../lib/sync/auth';
import { updateProfile } from '../lib/sync/profiles';
import { signInWithGoogle, signOutGoogle } from '../lib/sync/oauth';

interface AuthState {
  isAuthenticated: boolean;
  onboarded: boolean;
  user: User | null;
  role: UserRole | null;
  users: User[];
  // True after the user opens the password-reset deep link. Navigator then
  // shows ResetPasswordScreen; cleared once the user picks a new password.
  needsPasswordReset: boolean;
  setNeedsPasswordReset: (v: boolean) => void;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signup: (
    input: SignupParams,
  ) => Promise<
    { ok: true } | { ok: false; error: string } | { ok: 'verify'; email: string }
  >;
  loginWithGoogle: () => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  setOnboarded: (v: boolean) => void;
  setRole: (role: UserRole) => void;
  updateUser: (patch: Partial<User>) => void;
  updateUserById: (id: string, patch: Partial<User>) => void;
  applyMomentumScores: (scores: Record<string, number>) => void;
  _hasHydrated: boolean;
  _setHasHydrated: (v: boolean) => void;
}

export type { SignupParams as SignupInput };

const PERSISTED_KEYS: (keyof User)[] = [
  'name',
  'username',
  'avatar',
  'bio',
  'industry',
  'role',
  'momentumScore',
  'verificationLevel',
  'publicKey',
  'revealToAll',
  'avatarUrl',
  'coverUrl',
  'headline',
  'location',
  'website',
  'linkedinUrl',
  'twitterUrl',
  'instagramUrl',
  'githubUrl',
  'facebookUrl',
  'companyName',
  'sector',
  'foundedYear',
  'teamSize',
];

const persistedPatch = (patch: Partial<User>): Partial<User> => {
  // Filter to fields that map to columns we're allowed to write under RLS.
  const out: Partial<User> = {};
  for (const key of PERSISTED_KEYS) {
    if (patch[key] !== undefined) (out as Record<string, unknown>)[key] = patch[key];
  }
  return out;
};

export const useAuthStore = create<AuthState>()(
  persist<AuthState>(
    (set, get) => ({
      isAuthenticated: false,
      onboarded: false,
      user: null,
      role: null,
      users: [],
      needsPasswordReset: false,
      setNeedsPasswordReset: (v) => set({ needsPasswordReset: v }),
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      login: async (email, password) => {
        try {
          const user = await signInWithPassword(email, password);
          set({
            isAuthenticated: true,
            user,
            role: user.role,
            onboarded: user.onboarded === true,
          });
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'Login failed.' };
        }
      },

      signup: async (params) => {
        try {
          const user = await signUpWithPassword(params);
          set({ isAuthenticated: true, user, role: user.role, onboarded: false });
          return { ok: true };
        } catch (err) {
          if (err instanceof EmailConfirmationRequired) {
            return { ok: 'verify', email: err.email };
          }
          return { ok: false, error: err instanceof Error ? err.message : 'Signup failed.' };
        }
      },

      loginWithGoogle: async () => {
        try {
          const user = await signInWithGoogle();
          set({
            isAuthenticated: true,
            user,
            role: user.role,
            // Fresh OAuth users land on CompleteProfileScreen via Navigator gate.
            onboarded: user.profileComplete === true && user.onboarded === true,
          });
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'Google sign-in failed.' };
        }
      },

      logout: async () => {
        try {
          await supabaseSignOut();
        } catch {}
        try {
          await signOutGoogle();
        } catch {}
        set({ isAuthenticated: false, user: null, role: null, onboarded: false });
      },

      setOnboarded: (v) => {
        set({ onboarded: v });
        const me = get().user;
        if (me) {
          const next = { ...me, onboarded: v };
          set({ user: next });
          updateProfile(me.id, { onboarded: v }).catch((err) =>
            console.warn('[auth] setOnboarded sync failed:', err),
          );
        }
      },

      setRole: (role) => {
        const current = get().user;
        if (!current) return;
        const next = { ...current, role };
        set({
          role,
          user: next,
          users: get().users.map((u) => (u.id === next.id ? next : u)),
        });
        updateProfile(next.id, { role }).catch((err) =>
          console.warn('[auth] setRole sync failed:', err),
        );
      },

      updateUser: (patch) => {
        const current = get().user;
        if (!current) return;
        const next = { ...current, ...patch };
        set({
          user: next,
          users: get().users.map((u) => (u.id === next.id ? next : u)),
        });
        const remote = persistedPatch(patch);
        if (Object.keys(remote).length > 0) {
          updateProfile(next.id, remote).catch((err) =>
            console.warn('[auth] updateUser sync failed:', err),
          );
        }
      },

      updateUserById: (id, patch) => {
        const current = get().user;
        const users = get().users.map((u) => (u.id === id ? { ...u, ...patch } : u));
        const patchOut: Partial<AuthState> = { users };
        if (current && current.id === id) patchOut.user = { ...current, ...patch };
        set(patchOut);
        // Caller is responsible for syncing peer changes (e.g. peer publicKey
        // is synthetic-only in chat handshake; admin role/verification changes
        // are wired in their own flows).
      },

      applyMomentumScores: (scores) => {
        const ids = Object.keys(scores);
        if (ids.length === 0) return;
        const current = get().user;
        let userChanged = false;
        const users = get().users.map((u) => {
          const next = scores[u.id];
          if (next === undefined || next === u.momentumScore) return u;
          if (current && u.id === current.id) userChanged = true;
          return { ...u, momentumScore: next };
        });
        const patch: Partial<AuthState> = { users };
        if (userChanged && current) {
          const updatedSelf = users.find((u) => u.id === current.id);
          if (updatedSelf) {
            patch.user = updatedSelf;
            updateProfile(current.id, { momentumScore: updatedSelf.momentumScore }).catch(
              (err) => console.warn('[auth] momentum sync failed:', err),
            );
          }
        }
        set(patch);
      },
    }),
    { name: 'auth', version: 2 },
  ),
);
