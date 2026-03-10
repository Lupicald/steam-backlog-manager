import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';

const isServer = typeof window === 'undefined';

const noopStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

const webStorage = {
  getItem: async (key: string) => window.localStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    window.localStorage.removeItem(key);
  },
};

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const nativeSecureStorage = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key, secureStoreOptions);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value, secureStoreOptions);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key, secureStoreOptions);
  },
};

const authStorage =
  Platform.OS === 'web'
    ? (isServer ? noopStorage : webStorage)
    : nativeSecureStorage;

// Singleton Supabase client.
// Uses platform-appropriate storage and avoids touching window during SSR.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
