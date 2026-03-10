import { getDatabase } from './schema';
import { Game, GameStatus, GamePriority, BacklogStats, AppSettings } from '../types';

// ISO-8601 UTC timestamp matching Postgres TIMESTAMPTZ output format.
// Using strftime instead of datetime() avoids the space-separated format
// that would break string comparisons against Supabase timestamps.
const NOW_UTC = `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`;

// ─── Games ───────────────────────────────────────────────────────────────────

export function getAllGames(): Game[] {
  const db = getDatabase();
  return db.getAllSync<Game>(
    `SELECT * FROM games WHERE deleted_at IS NULL ORDER BY sort_order ASC, priority DESC, title ASC`
  );
}

export function getGamesByStatus(status: GameStatus): Game[] {
  const db = getDatabase();
  return db.getAllSync<Game>(
    `SELECT * FROM games WHERE status = ? AND deleted_at IS NULL
     ORDER BY priority DESC, sort_order ASC, title ASC`,
    [status]
  );
}

export function getGameById(id: number): Game | null {
  const db = getDatabase();
  return db.getFirstSync<Game>(`SELECT * FROM games WHERE id = ? AND deleted_at IS NULL`, [id]) ?? null;
}

export function getGameBySteamId(steamAppId: number): Game | null {
  const db = getDatabase();
  return (
    db.getFirstSync<Game>(`SELECT * FROM games WHERE steam_app_id = ? AND deleted_at IS NULL`, [steamAppId]) ?? null
  );
}

export function upsertGame(
  steamAppId: number,
  title: string,
  coverUrl: string,
  playtimeMinutes: number,
  lastPlayed: string | null,
  platform: string = 'steam'
): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO games (steam_app_id, title, cover_url, playtime_minutes, last_played, platform, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ${NOW_UTC}, 0)
     ON CONFLICT(steam_app_id) DO UPDATE SET
       title            = excluded.title,
       cover_url        = excluded.cover_url,
       playtime_minutes = excluded.playtime_minutes,
       last_played      = excluded.last_played,
       platform         = excluded.platform,
       updated_at       = ${NOW_UTC},
       deleted_at       = NULL,
       synced           = 0`,
    [steamAppId, title, coverUrl, playtimeMinutes, lastPlayed, platform]
  );
}

// ─── Input sanitization helpers ───────────────────────────────────────────────

function sanitizeText(value: string, maxLen: number): string {
  return (value ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, maxLen).trim();
}

function sanitizeUrl(url: string): string {
  if (!url) return '';
  // Only allow http(s) and data URIs (cover images)
  if (/^(https?:|data:image\/)/.test(url)) return url.slice(0, 2048);
  return '';
}

export function insertManualGame(draft: {
  title: string;
  coverUrl: string;
  platform: string;
  status: string;
  priority: string;
  notes: string;
  releaseYear: number | null;
  summary: string | null;
  genreNames: string | null;
  developerName: string | null;
  publisherName: string | null;
  externalId: string | null;
  idSource: string;
}): number {
  const db = getDatabase();

  // Validate required fields
  const cleanTitle = sanitizeText(draft.title, 512);
  if (!cleanTitle) throw new Error('Game title is required.');

  // Clamp and validate numeric fields
  const cleanYear = draft.releaseYear != null
    ? Math.max(1970, Math.min(2100, Math.floor(draft.releaseYear)))
    : null;

  // Use a sentinel steam_app_id of 0 for manual entries; real uniqueness is enforced by idx_games_source_external
  const fakeAppId = -(Date.now() % 2147483647);
  db.runSync(
    `INSERT INTO games (
       steam_app_id, title, cover_url, platform, status, priority, notes,
       release_year, summary, genre_names, developer_name, publisher_name,
       external_id, id_source, metadata_source, metadata_cached_at,
       is_manual_entry, updated_at, synced
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${NOW_UTC}, 1, ${NOW_UTC}, 0)`,
    [
      fakeAppId,
      cleanTitle,
      sanitizeUrl(draft.coverUrl),
      sanitizeText(draft.platform, 64),
      sanitizeText(draft.status, 64),
      sanitizeText(draft.priority, 32),
      sanitizeText(draft.notes, 2000),
      cleanYear,
      draft.summary ? sanitizeText(draft.summary, 2000) : null,
      draft.genreNames ? sanitizeText(draft.genreNames, 512) : null,
      draft.developerName ? sanitizeText(draft.developerName, 256) : null,
      draft.publisherName ? sanitizeText(draft.publisherName, 256) : null,
      draft.externalId ? sanitizeText(draft.externalId, 128) : null,
      sanitizeText(draft.idSource, 32),
      draft.idSource === 'igdb' ? 'igdb' : 'manual',
    ]
  );
  const row = db.getFirstSync<{ id: number }>(`SELECT last_insert_rowid() as id`);
  return row?.id ?? 0;
}

export function updateGameStatus(id: number, status: GameStatus): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE games SET status = ?, updated_at = ${NOW_UTC}, synced = 0 WHERE id = ?`,
    [status, id]
  );
}

export function updateGamePriority(id: number, priority: GamePriority): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE games SET priority = ?, updated_at = ${NOW_UTC}, synced = 0 WHERE id = ?`,
    [priority, id]
  );
}

export function updateGameProgress(id: number, progress: number): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE games SET progress_percentage = ?, updated_at = ${NOW_UTC}, synced = 0 WHERE id = ?`,
    [progress, id]
  );
}

export function updateGameHLTB(
  id: number,
  mainStory: number | null,
  extra: number | null,
  completionist: number | null
): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE games SET hltb_main_story = ?, hltb_extra = ?, hltb_completionist = ?,
     updated_at = ${NOW_UTC}, synced = 0 WHERE id = ?`,
    [mainStory, extra, completionist, id]
  );
}

export function updateGameNotes(id: number, notes: string): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE games SET notes = ?, updated_at = ${NOW_UTC}, synced = 0 WHERE id = ?`,
    [notes, id]
  );
}

export function updateGame(
  id: number,
  fields: Partial<Pick<Game, 'status' | 'priority' | 'progress_percentage' | 'notes' | 'exclude_from_backlog' | 'playtime_minutes' | 'last_played'>>
): void {
  const db = getDatabase();
  const entries = Object.entries(fields);
  if (entries.length === 0) return;
  const setClauses = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
  db.runSync(
    `UPDATE games SET ${setClauses}, updated_at = ${NOW_UTC}, synced = 0 WHERE id = ?`,
    [...values, id]
  );
}

/** Soft delete — marks the row as deleted and queues it for sync so other devices learn about it. */
export function deleteGame(id: number): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE games SET deleted_at = ${NOW_UTC}, updated_at = ${NOW_UTC}, synced = 0 WHERE id = ?`,
    [id]
  );
}

export function searchGames(query: string): Game[] {
  const db = getDatabase();
  return db.getAllSync<Game>(
    `SELECT * FROM games WHERE title LIKE ? AND deleted_at IS NULL ORDER BY title ASC`,
    [`%${query}%`]
  );
}

export function getGameCountByPlatform(platform: string): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM games WHERE platform = ? AND deleted_at IS NULL`,
    [platform]
  );
  return row?.n ?? 0;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getBacklogStats(): BacklogStats {
  const db = getDatabase();

  const row = db.getFirstSync<{
    total: number;
    playing: number;
    up_next: number;
    paused: number;
    completed: number;
    abandoned: number;
    not_started: number;
    excluded_from_backlog: number;
    hltb_target_met: number;
    hltb_ready_to_finish: number;
  }>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'playing'     THEN 1 ELSE 0 END) AS playing,
      SUM(CASE WHEN status = 'up_next'     THEN 1 ELSE 0 END) AS up_next,
      SUM(CASE WHEN status = 'paused'      THEN 1 ELSE 0 END) AS paused,
      SUM(CASE WHEN status = 'completed'   THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'abandoned'   THEN 1 ELSE 0 END) AS abandoned,
      SUM(CASE WHEN status = 'not_started' THEN 1 ELSE 0 END) AS not_started,
      SUM(CASE WHEN exclude_from_backlog = 1 THEN 1 ELSE 0 END) AS excluded_from_backlog,
      SUM(CASE WHEN hltb_main_story IS NOT NULL AND playtime_minutes * 60 >= hltb_main_story THEN 1 ELSE 0 END) AS hltb_target_met,
      SUM(CASE WHEN hltb_main_story IS NOT NULL AND status NOT IN ('completed', 'abandoned') AND playtime_minutes * 60 >= hltb_main_story THEN 1 ELSE 0 END) AS hltb_ready_to_finish
    FROM games
    WHERE deleted_at IS NULL
  `) ?? {
    total: 0, playing: 0, up_next: 0, paused: 0,
    completed: 0, abandoned: 0, not_started: 0, excluded_from_backlog: 0,
    hltb_target_met: 0, hltb_ready_to_finish: 0,
  };

  const hoursRow = db.getFirstSync<{ remaining: number }>(`
    SELECT
      SUM(
        CASE
          WHEN status NOT IN ('completed', 'abandoned') AND exclude_from_backlog = 0 THEN
            COALESCE(hltb_main_story, playtime_minutes * 3, 0) / 3600.0
          ELSE 0
        END
      ) AS remaining
    FROM games
    WHERE deleted_at IS NULL
  `);

  const playtimeRow = db.getFirstSync<{ total: number }>(`
    SELECT SUM(playtime_minutes) / 60.0 AS total FROM games WHERE deleted_at IS NULL
  `);

  return {
    ...row,
    total_hours_remaining: Math.round(hoursRow?.remaining ?? 0),
    total_playtime_hours: Math.round(playtimeRow?.total ?? 0),
  };
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSetting(key: string): string {
  const db = getDatabase();
  const row = db.getFirstSync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`, [key]
  );
  return row?.value ?? '';
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export function getAllSettings(): AppSettings {
  return {
    steam_id: getSetting('steam_id'),
    steam_api_key: getSetting('steam_api_key'),
    default_sort: getSetting('default_sort') || 'priority',
    show_nsfw: getSetting('show_nsfw') === 'true',
    theme: (getSetting('theme') || 'dark') as AppSettings['theme'],
    is_premium: getSetting('is_premium') === 'true',
    currency: (getSetting('currency') || 'usd') as 'usd' | 'mxn',
  };
}

// ─── Prices ───────────────────────────────────────────────────────────────────

export function updateGamePrice(id: number, priceCents: number): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE games SET price_cents = ? WHERE id = ?`,
    [priceCents, id]
  );
}

export function convertAllGamePrices(multiplier: number): void {
  const db = getDatabase();
  db.runSync(
    'UPDATE games SET price_cents = CAST(ROUND(price_cents * ?) AS INTEGER) WHERE price_cents IS NOT NULL',
    [multiplier]
  );
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export function getCandidatesForRecommendation(): Game[] {
  const db = getDatabase();
  return db.getAllSync<Game>(`
    SELECT * FROM games
    WHERE status IN ('up_next', 'paused', 'not_started', 'playing')
      AND exclude_from_backlog = 0
      AND deleted_at IS NULL
    ORDER BY
      CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      CASE status WHEN 'playing' THEN 0 WHEN 'up_next' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
      CASE WHEN hltb_main_story IS NOT NULL THEN hltb_main_story ELSE 99999 END,
      last_played ASC NULLS FIRST,
      title ASC
    LIMIT 60
  `);
}

// ─── Gaming Sessions ──────────────────────────────────────────────────────────

export function logGamingSession(gameId: number, durationMinutes: number, notes: string = ''): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO gaming_sessions (game_id, duration_minutes, notes) VALUES (?, ?, ?)`,
    [gameId, durationMinutes, notes]
  );
}

export function getGamingSessionsForGame(gameId: number) {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM gaming_sessions WHERE game_id = ? ORDER BY session_date DESC`, [gameId]);
}

export function getTotalPlaytimeMinutes(gameId: number): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ total: number }>(
    `SELECT SUM(duration_minutes) as total FROM gaming_sessions WHERE game_id = ?`,
    [gameId]
  );
  return row?.total ?? 0;
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export function getChallengesForMonth(monthYear: string) {
  const db = getDatabase();
  return db.getAllSync(`SELECT * FROM backlog_challenges WHERE month_year = ?`, [monthYear]);
}

export function upsertChallenge(type: string, target: number, progress: number, status: string, monthYear: string): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO backlog_challenges (type, target, progress, status, month_year)
     VALUES (?, ?, ?, ?, ?)`,
    [type, target, progress, status, monthYear]
  );
}

// ─── Multi-platform game upsert ───────────────────────────────────────────────

/** Deterministic negative hash so GOG/Epic games satisfy steam_app_id NOT NULL UNIQUE. */
function externalIdHash(idSource: string, externalId: string): number {
  let h = 0;
  const s = `${idSource}_${externalId}`;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return -(Math.abs(h) % 2_000_000_000 || 1);
}

export function upsertExternalGame(
  externalId: string,
  idSource: string,
  title: string,
  coverUrl: string,
  playtimeMinutes: number,
  lastPlayed: string | null,
  platform: string
): void {
  const db = getDatabase();
  const fakeAppId = externalIdHash(idSource, externalId);
  db.runSync(
    `INSERT INTO games (steam_app_id, external_id, id_source, title, cover_url, playtime_minutes, last_played, platform, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${NOW_UTC}, 0)
     ON CONFLICT(id_source, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
       title            = excluded.title,
       cover_url        = excluded.cover_url,
       playtime_minutes = excluded.playtime_minutes,
       last_played      = excluded.last_played,
       platform         = excluded.platform,
       updated_at       = ${NOW_UTC},
       deleted_at       = NULL,
       synced           = 0`,
    [fakeAppId, externalId, idSource, title, coverUrl, playtimeMinutes, lastPlayed, platform]
  );
}

export function getGameByExternalId(externalId: string, idSource: string): Game | null {
  const db = getDatabase();
  return (
    db.getFirstSync<Game>(
      `SELECT * FROM games WHERE external_id = ? AND id_source = ? AND deleted_at IS NULL`,
      [externalId, idSource]
    ) ?? null
  );
}

// ─── Nuclear option ────────────────────────────────────────────────────────────

/** Permanently deletes ALL local data. The caller is responsible for resetting app state. */
export function deleteAllLocalData(): void {
  const db = getDatabase();
  db.runSync('DELETE FROM games');
  db.runSync('DELETE FROM gaming_sessions');
  db.runSync('DELETE FROM backlog_challenges');
  db.runSync('DELETE FROM settings');
}

// ─── Sync queries ─────────────────────────────────────────────────────────────

/** All games that haven't been pushed to Supabase yet (includes soft-deleted rows). */
export function getUnsyncedGames(): Game[] {
  const db = getDatabase();
  return db.getAllSync<Game>(`SELECT * FROM games WHERE synced = 0 ORDER BY updated_at ASC`);
}

/** Mark a game as synced and store its remote UUID. */
export function markGameSynced(id: number, remoteId: string): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE games SET synced = 1, remote_id = ? WHERE id = ?`,
    [remoteId, id]
  );
}

/**
 * Upsert a game row received from Supabase during pull sync.
 * Skips rows where the local record is newer (last-write-wins).
 */
export function mergeRemoteGame(remote: {
  steam_app_id: number;
  title: string;
  cover_url: string;
  status: string;
  priority: string;
  platform: string;
  playtime_minutes: number;
  hltb_main_story: number | null;
  hltb_completionist: number | null;
  hltb_extra: number | null;
  last_played: string | null;
  notes: string;
  progress_percentage: number;
  sort_order: number;
  exclude_from_backlog: boolean;
  updated_at: string;
  deleted_at: string | null;
  device_id: string | null;
  external_id: string | null;
  id: string; // UUID
}): void {
  const db = getDatabase();
  const local = db.getFirstSync<{ updated_at: string | null }>(
    `SELECT updated_at FROM games WHERE steam_app_id = ?`,
    [remote.steam_app_id]
  );

  // If we have a local record that is strictly newer, keep it (it will push on next sync).
  if (local?.updated_at && local.updated_at > remote.updated_at) return;

  db.runSync(
    `INSERT INTO games
       (steam_app_id, title, cover_url, status, priority, platform,
        playtime_minutes, hltb_main_story, hltb_completionist, hltb_extra,
        last_played, notes, progress_percentage, sort_order,
        exclude_from_backlog, updated_at, deleted_at, external_id, synced, remote_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)
     ON CONFLICT(steam_app_id) DO UPDATE SET
       title                = excluded.title,
       cover_url            = excluded.cover_url,
       status               = excluded.status,
       priority             = excluded.priority,
       platform             = excluded.platform,
       playtime_minutes     = excluded.playtime_minutes,
       hltb_main_story      = excluded.hltb_main_story,
       hltb_completionist   = excluded.hltb_completionist,
       hltb_extra           = excluded.hltb_extra,
       last_played          = excluded.last_played,
       notes                = excluded.notes,
       progress_percentage  = excluded.progress_percentage,
       sort_order           = excluded.sort_order,
       exclude_from_backlog = excluded.exclude_from_backlog,
       updated_at           = excluded.updated_at,
       deleted_at           = excluded.deleted_at,
       external_id          = excluded.external_id,
       synced               = 1,
       remote_id            = excluded.remote_id`,
    [
      remote.steam_app_id,
      remote.title,
      remote.cover_url,
      remote.status,
      remote.priority,
      remote.platform,
      remote.playtime_minutes,
      remote.hltb_main_story,
      remote.hltb_completionist,
      remote.hltb_extra,
      remote.last_played,
      remote.notes,
      remote.progress_percentage,
      remote.sort_order,
      remote.exclude_from_backlog ? 1 : 0,
      remote.updated_at,
      remote.deleted_at ?? null,
      remote.external_id ?? null,
      remote.id,
    ]
  );
}
