import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { kvStorage } from '@/lib/storage';

/**
 * Storage for secrets (session tokens, the guest key): the Android Keystore on phones. The web preview has no
 * keystore, so it uses browser storage there.
 */
export const secureStorage = {
  get: (key: string): Promise<string | null> =>
    Platform.OS === 'web' ? kvStorage.getItem(key) : SecureStore.getItemAsync(key),
  set: (key: string, value: string): Promise<void> =>
    Platform.OS === 'web' ? kvStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  remove: (key: string): Promise<void> =>
    Platform.OS === 'web' ? kvStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};
