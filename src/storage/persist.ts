import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateCreator, StoreApi } from 'zustand';

type PersistOptions<T> = {
  name: string;
  version?: number;
  partialize?: (state: T) => Partial<T>;
};

type WithHydration = { _hasHydrated: boolean; _setHasHydrated: (v: boolean) => void };

export const persist =
  <T extends object>(config: StateCreator<T & WithHydration>, options: PersistOptions<T>) =>
  (
    set: StoreApi<T & WithHydration>['setState'],
    get: StoreApi<T & WithHydration>['getState'],
    api: StoreApi<T & WithHydration>
  ): T & WithHydration => {
    const key = `@scaletrek/${options.name}/v${options.version ?? 1}`;

    const initial = config(
      (partial: any, replace?: any) => {
        set(partial, replace);
        const next = get();
        const snapshot = options.partialize ? options.partialize(next as T) : next;
        const { _hasHydrated, _setHasHydrated, ...clean } = snapshot as any;
        AsyncStorage.setItem(key, JSON.stringify(clean)).catch(() => {});
      },
      get,
      api
    );

    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            set(parsed, false);
          } catch {}
        }
        (get()._setHasHydrated as any)(true);
      })
      .catch(() => (get()._setHasHydrated as any)(true));

    return {
      ...initial,
      _hasHydrated: false,
      _setHasHydrated: (v: boolean) => set({ _hasHydrated: v } as any, false),
    };
  };

export const clearPersistedStore = (name: string, version = 1) =>
  AsyncStorage.removeItem(`@scaletrek/${name}/v${version}`);

export const wipeAllStores = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((k) => k.startsWith('@scaletrek/'));
  if (ours.length) await AsyncStorage.multiRemove(ours);
};
