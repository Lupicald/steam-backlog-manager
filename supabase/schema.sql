-- ============================================================
-- GameStack — Supabase Schema
-- Paste this entire file into the Supabase SQL Editor and run.
-- ============================================================

-- ─── Profiles ────────────────────────────────────────────────
-- Auto-created when a user signs up via a trigger.

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: owner select" ON public.profiles;
CREATE POLICY "profiles: owner select"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: owner update" ON public.profiles;
CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger: create profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Games ───────────────────────────────────────────────────
-- Mirrors the local SQLite games table.
-- UNIQUE(user_id, steam_app_id) allows safe upserts.

CREATE TABLE IF NOT EXISTS public.games (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  steam_app_id        INTEGER     NOT NULL,
  title               TEXT        NOT NULL,
  cover_url           TEXT        NOT NULL DEFAULT '',
  status              TEXT        NOT NULL DEFAULT 'not_started',
  priority            TEXT        NOT NULL DEFAULT 'medium',
  platform            TEXT        NOT NULL DEFAULT 'steam',
  playtime_minutes    INTEGER     NOT NULL DEFAULT 0,
  hltb_main_story     INTEGER,
  hltb_completionist  INTEGER,
  hltb_extra          INTEGER,
  last_played         TIMESTAMPTZ,
  notes               TEXT        NOT NULL DEFAULT '',
  progress_percentage INTEGER     NOT NULL DEFAULT 0,
  sort_order          INTEGER     NOT NULL DEFAULT 0,
  exclude_from_backlog BOOLEAN     NOT NULL DEFAULT false,
  deleted_at          TIMESTAMPTZ,
  device_id           TEXT,
  external_id         TEXT,
  id_source           TEXT        NOT NULL DEFAULT 'steam',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, steam_app_id),
  UNIQUE (user_id, id_source, external_id)
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "games: owner all" ON public.games;
CREATE POLICY "games: owner all"
  ON public.games FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS games_touch_updated_at ON public.games;
CREATE TRIGGER games_touch_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── Gaming Sessions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gaming_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_remote_id   UUID        REFERENCES public.games(id) ON DELETE CASCADE,
  steam_app_id     INTEGER     NOT NULL,
  duration_minutes INTEGER     NOT NULL,
  session_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes            TEXT        NOT NULL DEFAULT '',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gaming_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions: owner all" ON public.gaming_sessions;
CREATE POLICY "sessions: owner all"
  ON public.gaming_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS sessions_touch_updated_at ON public.gaming_sessions;
CREATE TRIGGER sessions_touch_updated_at
  BEFORE UPDATE ON public.gaming_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── Stats (snapshot, updated by app) ────────────────────────

CREATE TABLE IF NOT EXISTS public.stats (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_games     INTEGER     NOT NULL DEFAULT 0,
  completed_games INTEGER     NOT NULL DEFAULT 0,
  backlog_hours   FLOAT       NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stats: owner all" ON public.stats;
CREATE POLICY "stats: owner all"
  ON public.stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Indexes ─────────────────────────────────────────────────

-- Composite for the common delta-pull query: WHERE user_id = ? AND updated_at > ?
CREATE INDEX IF NOT EXISTS idx_games_user_updated
  ON public.games (user_id, updated_at DESC);

-- Standalone indexes so queries filtering by only one column still hit an index
CREATE INDEX IF NOT EXISTS idx_games_user_id
  ON public.games (user_id);

CREATE INDEX IF NOT EXISTS idx_games_updated_at
  ON public.games (updated_at DESC);

-- Partial index to quickly find non-deleted rows per user
CREATE INDEX IF NOT EXISTS idx_games_user_active
  ON public.games (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON public.gaming_sessions (user_id, session_date DESC);

-- Multi-platform: index for lookups by source + external ID
CREATE INDEX IF NOT EXISTS idx_games_source_external
  ON public.games (user_id, id_source, external_id)
  WHERE external_id IS NOT NULL;
