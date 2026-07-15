-- ═══════════════════════════════════════════════════════════════════════════
-- Asystent przeglądu celów — sesje spotkań, itemy agendy, akcje (zadania).
-- Raport = ukończone goal_review_meetings (+ items / actions).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.goal_review_meetings (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.goal_boards (id) on delete cascade,
  facilitator_id uuid references public.profiles (id) on delete set null,
  planned_minutes int not null check (planned_minutes >= 15),
  summary_buffer_seconds int not null default 600 check (summary_buffer_seconds >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'in_progress', 'completed', 'cancelled')),
  participant_ids jsonb not null default '[]'::jsonb,
  ai_summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goal_review_meetings_board_idx
  on public.goal_review_meetings (board_id, created_at desc);
create index if not exists goal_review_meetings_status_idx
  on public.goal_review_meetings (status, completed_at desc);

create table if not exists public.goal_review_meeting_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.goal_review_meetings (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  sort_order int not null default 0,
  planned_seconds int not null check (planned_seconds > 0),
  deep_dive boolean not null default false,
  actual_seconds int,
  remaining_seconds int,
  outcome text check (outcome is null or outcome in ('on_track', 'at_risk', 'off_track')),
  notes text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'active', 'done', 'skipped')),
  goal_review_id uuid references public.goal_reviews (id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, goal_id)
);

create index if not exists goal_review_meeting_items_meeting_idx
  on public.goal_review_meeting_items (meeting_id, sort_order);

create table if not exists public.goal_review_meeting_actions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.goal_review_meetings (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  item_id uuid references public.goal_review_meeting_items (id) on delete set null,
  initiative_id uuid references public.goal_initiatives (id) on delete set null,
  kanban_task_id uuid,
  title text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists goal_review_meeting_actions_meeting_idx
  on public.goal_review_meeting_actions (meeting_id, created_at);

alter table public.goal_review_meetings enable row level security;
alter table public.goal_review_meeting_items enable row level security;
alter table public.goal_review_meeting_actions enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'goal_review_meetings',
    'goal_review_meeting_items',
    'goal_review_meeting_actions'
  ] loop
    execute format('drop policy if exists %I on public.%I;', t || '_all', t);
    execute format(
      'create policy %I on public.%I for all using (true) with check (true);',
      t || '_all',
      t
    );
  end loop;
end $$;
