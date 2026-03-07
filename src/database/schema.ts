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

  // Ensure the new 'platform' column exists in games table
  ensureColumn(db, 'games', 'platform', `TEXT NOT NULL DEFAULT 'steam'`);

  // Gaming Sessions table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS gaming_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL,
      session_date TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT NOT NULL DEFAULT '',
      FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
    );
  `);

  // Backlog Challenges table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS backlog_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      target INTEGER NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      month_year TEXT NOT NULL
    );
  `);

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
      ('show_nsfw',     'false'),
      ('theme',         'dark'),
      ('is_premium',    'false');
  `);

  // Indexes for common queries
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_games_status   ON games(status);
    CREATE INDEX IF NOT EXISTS idx_games_priority ON games(priority);
    CREATE INDEX IF NOT EXISTS idx_gaming_sessions_game_id ON gaming_sessions(game_id);
    CREATE INDEX IF NOT EXISTS idx_challenges_month ON backlog_challenges(month_year);
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
