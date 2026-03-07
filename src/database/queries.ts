import { getDatabase } from './schema';
import { Game, GameStatus, GamePriority, BacklogStats, AppSettings } from '../types';

// ─── Games ───────────────────────────────────────────────────────────────────

export function getAllGames(): Game[] {
  const db = getDatabase();
  return db.getAllSync<Game>(
    `SELECT * FROM games ORDER BY sort_order ASC, priority DESC, title ASC`
  );
}

export function getGamesByStatus(status: GameStatus): Game[] {
  const db = getDatabase();
  return db.getAllSync<Game>(
    `SELECT * FROM games WHERE status = ?
     ORDER BY priority DESC, sort_order ASC, title ASC`,
    [status]
  );
}

export function getGameById(id: number): Game | null {
  const db = getDatabase();
  return db.getFirstSync<Game>(`SELECT * FROM games WHERE id = ?`, [id]) ?? null;
}

export function getGameBySteamId(steamAppId: number): Game | null {
  const db = getDatabase();
  return (
    db.getFirstSync<Game>(`SELECT * FROM games WHERE steam_app_id = ?`, [steamAppId]) ?? null
  );
}

export function upsertGame(
  steamAppId: number,
  title: string,
  coverUrl: string,
  playtimeMinutes: number,
  lastPlayed: string | null
): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO games (steam_app_id, title, cover_url, playtime_minutes, last_played)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(steam_app_id) DO UPDATE SET
       title            = excluded.title,
       cover_url        = excluded.cover_url,
       playtime_minutes = excluded.playtime_minutes,
       last_played      = excluded.last_played`,
    [steamAppId, title, coverUrl, playtimeMinutes, lastPlayed]
  );
}

export function updateGameStatus(id: number, status: GameStatus): void {
  const db = getDatabase();
  db.runSync(`UPDATE games SET status = ? WHERE id = ?`, [status, id]);
}

export function updateGamePriority(id: number, priority: GamePriority): void {
  const db = getDatabase();
  db.runSync(`UPDATE games SET priority = ? WHERE id = ?`, [priority, id]);
}

export function updateGameProgress(id: number, progress: number): void {
  const db = getDatabase();
  db.runSync(`UPDATE games SET progress_percentage = ? WHERE id = ?`, [progress, id]);
}

export function updateGameHLTB(
  id: number,
  mainStory: number | null,
  extra: number | null,
  completionist: number | null
): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE games SET hltb_main_story = ?, hltb_extra = ?, hltb_completionist = ? WHERE id = ?`,
    [mainStory, extra, completionist, id]
  );
}

export function updateGameNotes(id: number, notes: string): void {
  const db = getDatabase();
  db.runSync(`UPDATE games SET notes = ? WHERE id = ?`, [notes, id]);
}

export function updateGame(
  id: number,
  fields: Partial<Pick<Game, 'status' | 'priority' | 'progress_percentage' | 'notes'>>
): void {
  const db = getDatabase();
  const entries = Object.entries(fields);
  if (entries.length === 0) return;
  const setClauses = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
  db.runSync(`UPDATE games SET ${setClauses} WHERE id = ?`, [...values, id]);
}

export function deleteGame(id: number): void {
  const db = getDatabase();
  db.runSync(`DELETE FROM games WHERE id = ?`, [id]);
}

export function searchGames(query: string): Game[] {
  const db = getDatabase();
  return db.getAllSync<Game>(
    `SELECT * FROM games WHERE title LIKE ? ORDER BY title ASC`,
    [`%${query}%`]
  );
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
  }>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'playing'     THEN 1 ELSE 0 END) AS playing,
      SUM(CASE WHEN status = 'up_next'     THEN 1 ELSE 0 END) AS up_next,
      SUM(CASE WHEN status = 'paused'      THEN 1 ELSE 0 END) AS paused,
      SUM(CASE WHEN status = 'completed'   THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'abandoned'   THEN 1 ELSE 0 END) AS abandoned,
      SUM(CASE WHEN status = 'not_started' THEN 1 ELSE 0 END) AS not_started
    FROM games
  `) ?? {
    total: 0, playing: 0, up_next: 0, paused: 0,
    completed: 0, abandoned: 0, not_started: 0,
  };

  // Estimate remaining hours using HLTB main story where available,
  // falling back to playtime_minutes as a heuristic baseline.
  const hoursRow = db.getFirstSync<{ remaining: number }>(`
    SELECT
      SUM(
        CASE
          WHEN status NOT IN ('completed', 'abandoned') THEN
            COALESCE(hltb_main_story, playtime_minutes * 3, 0) / 3600.0
          ELSE 0
        END
      ) AS remaining
    FROM games
  `);

  const playtimeRow = db.getFirstSync<{ total: number }>(`
    SELECT SUM(playtime_minutes) / 60.0 AS total FROM games
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
    theme: 'dark',
  };
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export function getCandidatesForRecommendation(): Game[] {
  const db = getDatabase();
  return db.getAllSync<Game>(`
    SELECT * FROM games
    WHERE status IN ('up_next', 'paused', 'not_started')
    ORDER BY
      CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      CASE WHEN hltb_main_story IS NOT NULL THEN hltb_main_story ELSE 99999 END,
      last_played ASC NULLS FIRST
    LIMIT 20
  `);
}
