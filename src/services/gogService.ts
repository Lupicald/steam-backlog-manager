/**
 * gogService — import orchestrator for GOG via the embed web session.
 */

import { gogCoverUrl } from '../api/gog';
import { clearTokens } from './secureTokenService';
import { upsertExternalGame, getGameCountByPlatform, getSetting, setSetting } from '../database/queries';
import type { GOGGame, PlatformImportResult, PlatformConnection } from '../types';

export async function checkGOGConnection(): Promise<PlatformConnection> {
  const isWebConnected = getSetting('gog_web_connected') === 'true';
  const lastSynced = getSetting('gog_last_sync') || null;
  return {
    platform: 'gog',
    connected: isWebConnected,
    lastSynced,
    gameCount: getGameCountByPlatform('gog'),
  };
}

export async function importGOGProducts(
  products: GOGGame[],
  onProgress?: (done: number, total: number) => void
): Promise<PlatformImportResult> {
  const result: PlatformImportResult = { platform: 'gog', imported: 0, skipped: 0, errors: [] };
  const total = products.length;

  try {
    for (let index = 0; index < products.length; index++) {
      const game = products[index];
      try {
        const coverUrl = gogCoverUrl(game.image);
        upsertExternalGame(String(game.id), 'gog', game.title, coverUrl, 0, null, 'gog');
        result.imported++;
      } catch {
        result.skipped++;
      }
      onProgress?.(index + 1, total);
    }

    setSetting('gog_web_connected', 'true');
    setSetting('gog_last_sync', new Date().toISOString());
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : 'GOG import failed');
  }

  return result;
}

export async function importGOGLibrary(): Promise<PlatformImportResult> {
  const connected = getSetting('gog_web_connected') === 'true';
  return connected
    ? { platform: 'gog', imported: 0, skipped: 0, errors: ['Open the GOG modal to sync this library.'] }
    : { platform: 'gog', imported: 0, skipped: 0, errors: ['Not connected to GOG. Please log in first.'] };
}

export async function disconnectGOG(): Promise<void> {
  await clearTokens('gog');
  setSetting('gog_last_sync', '');
  setSetting('gog_web_connected', '');
  setSetting('gog_consent_given', '');
}
