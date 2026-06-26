create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Clawson',
  parent_pin_hash text not null,
  dollar_balance numeric(10,2) not null default 0,
  screen_time_minutes int not null default 0,
  xp_balance int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_streak_date date,
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  xp int not null,
  period text not null check (period in ('morning','afternoon','bedtime','health','weekly','bonus')),
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table daily_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id),
  completed_date date not null,
  completed_at timestamptz default now(),
  unique(task_id, completed_date)
);

create table weekly_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id),
  week_start date not null,
  completed_at timestamptz default now(),
  unique(task_id, week_start)
);

create table xp_events (
  id uuid primary key default gen_random_uuid(),
  xp_delta int not null,
  reason text not null,
  event_type text not null check (event_type in (
    'task','streak_bonus','perfect_day','perfect_week',
    'penalty','makeup','bonus_award','payout_conversion'
  )),
  task_id uuid references tasks(id),
  event_date date not null default current_date,
  created_at timestamptz default now()
);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  gross_xp int not null,
  streak_bonus_xp int not null default 0,
  perfect_day_bonus_xp int not null default 0,
  perfect_week_bonus_xp int not null default 0,
  total_xp int not null,
  xp_to_dollars int not null default 0,
  xp_to_screen_time int not null default 0,
  dollars_earned numeric(10,2) not null default 0,
  screen_time_earned_minutes int not null default 0,
  interest_earned numeric(10,2) not null default 0,
  new_dollar_balance numeric(10,2) not null,
  new_screen_time_balance int not null,
  xp_carried_forward int not null default 0,
  created_at timestamptz default now()
);

-- RLS: enable on all tables, allow all ops for authenticated users
alter table families enable row level security;
alter table tasks enable row level security;
alter table daily_completions enable row level security;
alter table weekly_completions enable row level security;
alter table xp_events enable row level security;
alter table payouts enable row level security;

create policy "auth users full access" on families for all using (auth.role() = 'authenticated');
create policy "auth users full access" on tasks for all using (auth.role() = 'authenticated');
create policy "auth users full access" on daily_completions for all using (auth.role() = 'authenticated');
create policy "auth users full access" on weekly_completions for all using (auth.role() = 'authenticated');
create policy "auth users full access" on xp_events for all using (auth.role() = 'authenticated');
create policy "auth users full access" on payouts for all using (auth.role() = 'authenticated');
