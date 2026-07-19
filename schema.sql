-- NTG Auction — auction-owned tables. Run once against the same Neon DB as the
-- main site. References to main-site rows are TEXT (cuid), never UUID.
-- Main-site tables ("Tournament", "User", "TournamentRegistration") are
-- read-only from the auction side; we only add the auction_* tables below.

-- One auction per tournament. Holds all live state; the SERVER is the single
-- source of truth. bid_history is the bids on the *current* player only
-- (cleared on finalize) — same role as the Mongo embedded array.
CREATE TABLE IF NOT EXISTS auction_sessions (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tournament_id           TEXT NOT NULL UNIQUE,        -- -> "Tournament".id
  game                    TEXT NOT NULL,               -- VALORANT | CS2 | EA_FC26 | OTHER
  status                  TEXT NOT NULL DEFAULT 'idle'
                            CHECK (status IN ('idle','showcase','live','paused','complete')),
  pass                    INT  NOT NULL DEFAULT 1,
  starting_budget         INT  NOT NULL DEFAULT 150,
  roster_size             INT  NOT NULL DEFAULT 3,
  timer_seconds           INT  NOT NULL DEFAULT 15,
  min_bid_increment       INT  NOT NULL DEFAULT 1,
  co_captain_slots        INT  NOT NULL DEFAULT 0 CHECK (co_captain_slots BETWEEN 0 AND 4),
  auction_starts_at       TIMESTAMPTZ,
  auction_ends_at         TIMESTAMPTZ,
  -- rank -> floor price table: [{ "rank": "Diamond", "floor": 8 }, ...]
  rank_table              JSONB NOT NULL DEFAULT '[]',
  -- live block state
  current_registration_id TEXT,                        -- -> "TournamentRegistration".id
  current_price           INT  NOT NULL DEFAULT 0,
  highest_bidder_id       TEXT,                        -- -> auction_teams.id
  highest_bidder_name     TEXT,
  timer_ends_at           TIMESTAMPTZ,
  paused_remaining_ms     INT,
  bid_history             JSONB NOT NULL DEFAULT '[]', -- bids on the current player
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Teams in the auction (seeded from CAPTAIN registrations at init).
CREATE TABLE IF NOT EXISTS auction_teams (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id      TEXT NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  captain_user_id TEXT NOT NULL,                        -- -> "User".id
  registration_id TEXT,                                 -- the captain's registration
  starting_budget INT  NOT NULL,
  current_budget  INT  NOT NULL,
  color           TEXT
);

-- Per-session player lifecycle. This is the home for auction-only state that
-- the read-only "TournamentRegistration" table can't carry. A sold row also
-- IS the roster entry and the sale-log entry (ordered by sold_at), so no
-- separate team_roster / sale_log tables are needed.
CREATE TABLE IF NOT EXISTS auction_players (
  session_id      TEXT NOT NULL REFERENCES auction_sessions(id) ON DELETE CASCADE,
  registration_id TEXT NOT NULL,                        -- -> "TournamentRegistration".id
  floor_price     INT  NOT NULL,                        -- from rank_table at init
  status          TEXT NOT NULL DEFAULT 'pool'
                    CHECK (status IN ('pool','on_auction','sold','unsold')),
  sold_price      INT,
  team_id         TEXT REFERENCES auction_teams(id),
  sold_at         TIMESTAMPTZ,
  PRIMARY KEY (session_id, registration_id)
);

CREATE INDEX IF NOT EXISTS auction_players_status_idx
  ON auction_players (session_id, status);

-- Migration helpers for adding new settings fields
ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS co_captain_slots INT NOT NULL DEFAULT 0 CHECK (co_captain_slots BETWEEN 0 AND 4);
ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS auction_starts_at TIMESTAMPTZ;
ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS auction_ends_at TIMESTAMPTZ;
ALTER TABLE auction_teams ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS finalized BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE auction_sessions ADD COLUMN IF NOT EXISTS safe_max_slots INT NOT NULL DEFAULT 20;

