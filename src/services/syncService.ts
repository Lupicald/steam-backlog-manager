/**
 * syncService — offline-first cloud sync with Supabase.
 *
 * Architecture:
 *   App UI → SQLite (primary) → syncService → Supabase (backup/sync)
 *
 * Rules:
 *   - Never called from UI components directly.
 *   - Never polls faster than SYNC_INTERVAL_MS (5 min).
 *   - All failures are silent; local data is never deleted on error.
 *   - Conflict resolution: latest updated_at wins (last-write-wins).
 */

import { supabase } from './supabaseClient';
import {
  getUnsyncedGames,
  markGameSynced,
  mergeRemoteGame,
  getSetting,
  setSetting,
} from '../database/queries';
import { SYNC_INTERVAL_MS, SYNC_PAGE_SIZE } from '../config/supabase';

// ─── Device ID ────────────────────────────────────────────────────────────────
// Lazily generated once per install; stored in settings so it survives app restarts.

const DEVICE_ID_KEY = 'device_id';

function getOrCreateDeviceId(): string {
  let id = getSetting(DEVICE_ID_KEY);
  if (!id) {
    // Simple UUID v4 without external dependencies
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    setSetting(DEVICE_ID_KEY, id);
  }
  return id;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
}

// ─── Rate-limit guard ─────────────────────────────────────────────────────────

const LAST_SYNC_KEY = 'supabase_last_sync_ts';

function canSync(): boolean {
  const raw = getSetting(LAST_SYNC_KEY);
  if (!raw) return true;
  const last = Number(raw);
  return Date.now() - last >= SYNC_INTERVAL_MS;
}

function recordSync(): void {
  setSetting(LAST_SYNC_KEY, String(Date.now()));
}

// ─── Push (local → Supabase) ──────────────────────────────────────────────────

async function pushDirtyGames(userId: string): Promise<{ pushed: number; errors: string[] }> {
  const dirty = getUnsyncedGames();
  if (dirty.length === 0) return { pushed: 0, errors: [] };

  const deviceId = getOrCreateDeviceId();
  let pushed = 0;
  const errors: string[] = [];

  // Batch in groups of 50 to stay within Supabase payload limits
  const BATCH = 50;
  for (let i = 0; i < dirty.length; i += BATCH) {
    const batch = dirty.slice(i, i + BATCH).map((g) => ({
      user_id: userId,
      steam_app_id: g.steam_app_id,
      title: g.title,
      cover_url: g.cover_url || '',
      status: g.status || 'not_started',
      priority: g.priority || 'medium',
      platform: g.platform || 'steam',
      playtime_minutes: g.playtime_minutes || 0,
      hltb_main_story: g.hltb_main_story ?? null,
      hltb_completionist: g.hltb_completionist ?? null,
      hltb_extra: g.hltb_extra ?? null,
      last_played: g.last_played ?? null,
      notes: g.notes || '',
      progress_percentage: g.progress_percentage || 0,
      sort_order: g.sort_order || 0,
      exclude_from_backlog: Boolean(g.exclude_from_backlog),
      updated_at: g.updated_at ?? new Date().toISOString(),
      deleted_at: (g as any).deleted_at ?? null,
      device_id: deviceId,
    }));

    const { data, error } = await supabase
      .from('games')
      .upsert(batch, { onConflict: 'user_id,steam_app_id' })
      .select('id, steam_app_id');

    if (error) {
      errors.push(`Push batch failed: ${error.message}`);
      continue;
    }

    // Mark each successfully pushed game as synced with its remote UUID
    if (data) {
      for (const row of data) {
        const local = dirty.find((g) => g.steam_app_id === row.steam_app_id);
        if (local) {
          markGameSynced(local.id, row.id);
          pushed++;
        }
      }
    }
  }

  return { pushed, errors };
}

// ─── Pull (Supabase → local) ──────────────────────────────────────────────────

async function pullRemoteGames(userId: string): Promise<{ pulled: number; errors: string[] }> {
  const lastPullKey = `supabase_last_pull_${userId}`;
  const lastPull = getSetting(lastPullKey) || '1970-01-01T00:00:00.000Z';

  let pulled = 0;
  const errors: string[] = [];
  let from = 0;

  // Paginate to avoid fetching unbounded data
  while (true) {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', lastPull)
      .order('updated_at', { ascending: true })
      .range(from, from + SYNC_PAGE_SIZE - 1);

    if (error) {
      errors.push(`Pull failed: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      try {
        mergeRemoteGame(row as Parameters<typeof mergeRemoteGame>[0]);
        pulled++;
      } catch (e) {
        errors.push(`Merge failed for steam_app_id ${row.steam_app_id}`);
      }
    }

    if (data.length < SYNC_PAGE_SIZE) break;
    from += SYNC_PAGE_SIZE;
  }

  // Record the pull timestamp so the next pull only fetches deltas
  setSetting(lastPullKey, new Date().toISOString());
  return { pulled, errors };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run a full push + pull sync cycle.
 * Returns immediately if:
 *   - No authenticated user
 *   - Device is offline (caller should check before calling)
 *   - Less than SYNC_INTERVAL_MS since last sync
 */
export async function runSync(options?: { force?: boolean }): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, pulled: 0, errors: [] };

  if (!options?.force && !canSync()) {
    return result;
  }

  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return result;

  try {
    const pushResult = await pushDirtyGames(userId);
    result.pushed = pushResult.pushed;
    result.errors.push(...pushResult.errors);

    const pullResult = await pullRemoteGames(userId);
    result.pulled = pullResult.pulled;
    result.errors.push(...pullResult.errors);

    recordSync();
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : 'Unknown sync error');
  }

  return result;
}

/**
 * Push only dirty records without running a pull.
 * Useful to call immediately after a user makes a change.
 */
export async function pushPending(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  await pushDirtyGames(userId);
}
