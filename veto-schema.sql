-- Map veto — veto-owned tables. Run once against the same Neon/Supabase DB as
-- the main site (npm run db:veto-schema). References to main-site rows are TEXT
-- (cuid), never UUID. "TournamentMatch" is created by the main site's Prisma
-- migration and is read-only from here except for the final write-back.

CREATE TABLE IF NOT EXISTS veto_sessions (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  match_id       TEXT NOT NULL UNIQUE,          -- -> "TournamentMatch".id
  format         TEXT NOT NULL CHECK (format IN ('BO1','BO3','BO5')),
  -- Pool snapshotted at start so a mid-veto config change can't shift it.
  map_pool       JSONB NOT NULL,
  turn_order     JSONB NOT NULL,
  current_turn   INT  NOT NULL DEFAULT 0,
  actions        JSONB NOT NULL DEFAULT '[]',
  status         TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live','complete')),
  -- Both captains must ready up before any ban is accepted.
  ready_a        BOOLEAN NOT NULL DEFAULT false,
  ready_b        BOOLEAN NOT NULL DEFAULT false,
  -- Optimistic concurrency: any teammate may act, so two clicks can race.
  version        INT  NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS veto_sessions_status_idx
  ON veto_sessions (status);

-- Migration helpers for changes after the first release.
ALTER TABLE veto_sessions DROP COLUMN IF EXISTS turn_seconds;
ALTER TABLE veto_sessions DROP COLUMN IF EXISTS turn_deadline;
DROP INDEX IF EXISTS veto_sessions_status_idx;
CREATE INDEX IF NOT EXISTS veto_sessions_status_idx ON veto_sessions (status);
ALTER TABLE veto_sessions ADD COLUMN IF NOT EXISTS ready_a BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE veto_sessions ADD COLUMN IF NOT EXISTS ready_b BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE veto_sessions DROP CONSTRAINT IF EXISTS veto_sessions_format_check;
ALTER TABLE veto_sessions ADD CONSTRAINT veto_sessions_format_check
  CHECK (format IN ('BO1','BO3','BO5'));
