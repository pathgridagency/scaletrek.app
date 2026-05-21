import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { User, UserRole, VerificationLevel } from '../data/mockData';
import { updateProfile } from '../lib/sync/profiles';

interface UsersState {
  list: () => User[];
  byId: (id: string) => User | undefined;
  setRole: (id: string, role: UserRole) => Promise<void>;
  setVerification: (id: string, level: VerificationLevel) => Promise<void>;
  setSuspended: (id: string, suspended: boolean) => Promise<void>;
  patch: (id: string, patch: Partial<User>) => Promise<void>;
}

// Optimistic local update; reverts on server failure so the UI never lies.
const update = async (id: string, patch: Partial<User>) => {
  const prev = useAuthStore.getState();
  const next = prev.users.map((u) => (u.id === id ? { ...u, ...patch } : u));
  useAuthStore.setState({
    users: next,
    user: prev.user?.id === id ? { ...prev.user, ...patch } : prev.user,
  });
  try {
    await updateProfile(id, patch);
  } catch (err) {
    // revert
    useAuthStore.setState({ users: prev.users, user: prev.user });
    throw err;
  }
};

export const useUsersStore = create<UsersState>(() => ({
  list: () => useAuthStore.getState().users,
  byId: (id) => useAuthStore.getState().users.find((u) => u.id === id),
  setRole: (id, role) => update(id, { role }),
  setVerification: (id, verificationLevel) => update(id, { verificationLevel }),
  setSuspended: (id, suspended) => update(id, { suspended }),
  patch: (id, patch) => update(id, patch),
}));
