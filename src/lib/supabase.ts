import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '../config/env';

// SecureStore on Android caps values at ~2048 bytes; Supabase session JSON
// frequently exceeds that. We chunk on write and reassemble on read.
const CHUNK_SIZE = 1800;
const CHUNK_HEADER = '__chunked__:';

const sanitizeKey = (key: string): string => key.replace(/[^A-Za-z0-9._-]/g, '_');

const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const safe = sanitizeKey(key);
    const head = await SecureStore.getItemAsync(safe);
    if (head == null) return null;
    if (!head.startsWith(CHUNK_HEADER)) return head;
    const count = parseInt(head.slice(CHUNK_HEADER.length), 10);
    if (!Number.isFinite(count) || count <= 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${safe}__${i}`);
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const safe = sanitizeKey(key);
    const prev = await SecureStore.getItemAsync(safe);
    if (prev != null && prev.startsWith(CHUNK_HEADER)) {
      const prevCount = parseInt(prev.slice(CHUNK_HEADER.length), 10);
      if (Number.isFinite(prevCount) && prevCount > 0) {
        for (let i = 0; i < prevCount; i++) {
          await SecureStore.deleteItemAsync(`${safe}__${i}`);
        }
      }
    }
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(safe, value);
      return;
    }
    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(safe, `${CHUNK_HEADER}${chunkCount}`);
    for (let i = 0; i < chunkCount; i++) {
      await SecureStore.setItemAsync(
        `${safe}__${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
  },
  async removeItem(key: string): Promise<void> {
    const safe = sanitizeKey(key);
    const head = await SecureStore.getItemAsync(safe);
    if (head != null && head.startsWith(CHUNK_HEADER)) {
      const count = parseInt(head.slice(CHUNK_HEADER.length), 10);
      if (Number.isFinite(count) && count > 0) {
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${safe}__${i}`);
        }
      }
    }
    await SecureStore.deleteItemAsync(safe);
  },
};

// Native uses SecureStore; web has no SecureStore so fall back to AsyncStorage.
const authStorage = Platform.OS === 'web' ? AsyncStorage : secureStorage;

let _client: SupabaseClient | null = null;

export const supabase: SupabaseClient = (() => {
  if (_client) return _client;
  if (!isSupabaseConfigured()) {
    return new Proxy(
      {},
      {
        get() {
          throw new Error(
            'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.',
          );
        },
      },
    ) as unknown as SupabaseClient;
  }
  _client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage: authStorage as any,
      storageKey: 'scaletrek.auth',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return _client;
})();
