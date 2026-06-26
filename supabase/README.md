# Supabase Migrations

Run migrations via the Supabase dashboard SQL editor:
1. Go to your project at https://supabase.com/dashboard
2. Open **SQL Editor**
3. Paste the contents of each migration file and run in order

## Migrations

### 001_add_actor_to_xp_events.sql
Adds an `actor` column (`'kove'` or `'parent'`) to `xp_events` so the points history
ledger can show who earned or lost each set of points. Backfills existing rows by
inferring actor from `event_type`.
