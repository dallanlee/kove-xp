-- Add actor column to xp_events to track who earned/lost points
ALTER TABLE xp_events
ADD COLUMN IF NOT EXISTS actor text CHECK (actor IN ('kove', 'parent'));

-- Backfill existing rows: infer actor from event_type
UPDATE xp_events
SET actor = CASE
  WHEN event_type IN ('task', 'streak_bonus', 'perfect_day', 'perfect_week') THEN 'kove'
  WHEN event_type IN ('penalty', 'bonus_award', 'payout_conversion', 'makeup') THEN 'parent'
  ELSE 'kove'
END
WHERE actor IS NULL;

-- Indexes for ledger queries
CREATE INDEX IF NOT EXISTS idx_xp_events_event_date ON xp_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_actor ON xp_events(actor);
