/**
 * secureTokenService — encrypted storage for platform OAuth tokens.
 *
 * Uses expo-secure-store (Keychain on iOS, EncryptedSharedPreferences on Android).
 * Keys follow the convention: `{platform}_{tokenType}`.
 */

import * as SecureStore from 'expo-secure-store';
import type { ImportPlatform } from '../types';

function key(platform: ImportPlatform, tokenType: string): string {
  return `${platform}_${tokenType}`;
}

export async function getToken(
  platform: ImportPlatform,
  tokenType: string
): Promise<string | null> {
  return SecureStore.getItemAsync(key(platform, tokenType));
}

export async function setToken(
  platform: ImportPlatform,
  tokenType: string,
  value: string
): Promise<void> {
  await SecureStore.setItemAsync(key(platform, tokenType), value);
}

export async function clearTokens(platform: ImportPlatform): Promise<void> {
  const keys = ['access_token', 'refresh_token', 'token_expiry', 'session_cookies'];
  await Promise.all(
    keys.map((k) => SecureStore.deleteItemAsync(key(platform, k)).catch(() => {}))
  );
}

export async function isTokenExpired(platform: ImportPlatform): Promise<boolean> {
  const expiry = await getToken(platform, 'token_expiry');
  if (!expiry) return true;
  return Date.now() >= Number(expiry);
}

export async function setTokenWithExpiry(
  platform: ImportPlatform,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  await setToken(platform, 'access_token', accessToken);
  await setToken(platform, 'refresh_token', refreshToken);
  // Store expiry as unix ms, with 60s safety margin
  await setToken(platform, 'token_expiry', String(Date.now() + (expiresIn - 60) * 1000));
}
