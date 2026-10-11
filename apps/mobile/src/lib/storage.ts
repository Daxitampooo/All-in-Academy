import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Key-value storage for small local data (settings, progress).
 * AsyncStorage uses the device database on Android and localStorage on web.
 * Kept behind this module so it can be swapped (e.g. for MMKV) in one place.
 */
export const kvStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};
