/**
 * epicService — import orchestrator for Epic Games Store.
 *
 * Uses OAuth tokens obtained via exchange_code flow (same as Legendary/Heroic).
 * Tokens are stored in SecureStore and auto-refreshed when expired.
 */

import { fetchEpicLibrary, buildEpicCoverUrl, refreshEpicToken } from '../api/epic';
import {
  getToken,
  isTokenExpired,
  setTokenWithExpiry,
  clearTokens,
} from './secureTokenService';
import { upsertExternalGame, getGameCountByPlatform } from '../database/queries';
import { getSetting, setSetting } from '../database/queries';
import type { PlatformImportResult, PlatformConnection } from '../types';

/** Ensure we have a valid access token, refreshing if needed. Returns null if not connected. */
async function ensureAccessToken(): Promise<string | null> {
  const accessToken = await getToken('epic', 'access_token');
  if (!accessToken) return null;

  if (await isTokenExpired('epic')) {
    const refreshToken = await getToken('epic', 'refresh_token');
    if (!refreshToken) return null;

    try {
      const tokens = await refreshEpicToken(refreshToken);
      await setTokenWithExpiry('epic', tokens.access_token, tokens.refresh_token, tokens.expires_in);
      return tokens.access_token;
    } catch {
      return null; // Refresh failed — user must re-login
    }
  }

  return accessToken;
}

export async function checkEpicConnection(): Promise<PlatformConnection> {
  const token = await ensureAccessToken();
  const lastSynced = getSetting('epic_last_sync') || null;
  return {
    platform: 'epic',
    connected: !!token,
    lastSynced,
    gameCount: getGameCountByPlatform('epic'),
  };
}

export async function importEpicLibrary(
  onProgress?: (done: number, total: number) => void
): Promise<PlatformImportResult> {
  const result: PlatformImportResult = { platform: 'epic', imported: 0, skipped: 0, errors: [] };

  const accessToken = await ensureAccessToken();
  if (!accessToken) {
    result.errors.push('Not connected to Epic Games. Please log in first.');
    return result;
  }

  try {
    const games = await fetchEpicLibrary(accessToken);
    const total = games.length;

    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      try {
        const coverUrl = buildEpicCoverUrl(game);
        const externalId = game.catalogItemId || game.appName;
        upsertExternalGame(
          externalId,
          'epic',
          game.title,
          coverUrl,
          0,     // Epic doesn't expose playtime via library API
          null,
          'epic'
        );
        result.imported++;
      } catch {
        result.skipped++;
      }
      onProgress?.(i + 1, total);
    }

    setSetting('epic_last_sync', new Date().toISOString());
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Epic import failed';
    if (msg.includes('401') || msg.includes('403')) {
      result.errors.push('Epic session expired. Please log in again.');
    } else {
      result.errors.push(msg);
    }
  }

  return result;
}

export async function disconnectEpic(): Promise<void> {
  await clearTokens('epic');
  setSetting('epic_last_sync', '');
  setSetting('epic_consent_given', '');
}
