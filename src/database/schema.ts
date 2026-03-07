import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('steam_backlog.db');
  }
  return _db;
}

export function initializeDatabase(): void {
  const db = getDatabase();

  db.execSync(`PRAGMA journal_mode = WAL;`);

  // Games table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS games (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      steam_app_id        INTEGER NOT NULL UNIQUE,
      title               TEXT    NOT NULL,
      cover_url           TEXT    NOT NULL DEFAULT '',
      status              TEXT    NOT NULL DEFAULT 'not_started',
      priority            TEXT    NOT NULL DEFAULT 'medium',
      playtime_minutes    INTEGER NOT NULL DEFAULT 0,
      hltb_main_story     INTEGER,
      hltb_completionist  INTEGER,
      hltb_extra          INTEGER,
      last_played         TEXT,
      added_at            TEXT    NOT NULL DEFAULT (datetime('now')),
      notes               TEXT    NOT NULL DEFAULT '',
      progress_percentage INTEGER NOT NULL DEFAULT 0,
      sort_order          INTEGER NOT NULL DEFAULT 0,
      exclude_from_backlog INTEGER NOT NULL DEFAULT 0
    );
  `);

  ensureColumn(db, 'games', 'exclude_from_backlog', `INTEGER NOT NULL DEFAULT 0`);

  // Settings table (key-value store)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `);

  // Seed default settings if absent
  db.execSync(`
    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('steam_id',      ''),
      ('steam_api_key', ''),
      ('default_sort',  'priority'),
      ('show_nsfw',     'false');
  `);

  // Indexes for common queries
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_games_status   ON games(status);
    CREATE INDEX IF NOT EXISTS idx_games_priority ON games(priority);
  `);
}

function ensureColumn(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  columnDefinition: string
): void {
  const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${tableName});`);
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.execSync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
  }
}
