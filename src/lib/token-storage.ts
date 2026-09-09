import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { SessionTokens } from '@/src/features/auth/types';

const ACCESS_TOKEN_KEY = 'taskgrid.accessToken';
const REFRESH_TOKEN_KEY = 'taskgrid.refreshToken';

const webStorage = {
  get(key: string) {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key);
  },
  set(key: string, value: string) {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value);
  },
  remove(key: string) {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(key);
  },
};

async function getItem(key: string) {
  return Platform.OS === 'web' ? webStorage.get(key) : SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') webStorage.set(key, value);
  else await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string) {
  if (Platform.OS === 'web') webStorage.remove(key);
  else await SecureStore.deleteItemAsync(key);
}

export async function getSessionTokens(): Promise<SessionTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getItem(ACCESS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
  ]);
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export async function saveSessionTokens(tokens: SessionTokens) {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearSessionTokens() {
  await Promise.all([removeItem(ACCESS_TOKEN_KEY), removeItem(REFRESH_TOKEN_KEY)]);
}
