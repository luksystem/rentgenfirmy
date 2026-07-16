-- Zadania celu (odhaczanie), przełożenia / niedowiezienia oraz flaga „trzeba wrócić”.

alter table public.goal_initiatives
  add column if not exists completed_at timestamptz;

comment on column public.goal_initiatives.completed_at is 'Kiedy zadanie/inicjatywa została odhaczona jako zrobiona';

alter table public.goals
  add column if not exists needs_revisit boolean not null default false,
  add column if not exists revisit_at date,
  add column if not exists deferral_count integer not null default 0,
  add column if not exists last_deferral_reason text
    check (last_deferral_reason is null or last_deferral_reason in ('internal', 'external'));

comment on column public.goals.needs_revisit is 'Flaga z przeglądu: trzeba do tego wrócić';
comment on column public.goals.revisit_at is 'Data, kiedy wrócić do celu';
comment on column public.goals.deferral_count is 'Ile razy cel był przekładany na kolejny okres';
comment on column public.goals.last_deferral_reason is 'internal = niedowieziony z naszego powodu; external = poza naszą kontrolą';

create table if not exists public.goal_deferrals (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  meeting_id uuid references public.goal_review_meetings (id) on delete set null,
  reason text not null check (reason in ('internal', 'external')),
  note text not null default '',
  previous_period_start date not null,
  previous_period_end date not null,
  new_period_start date not null,
  new_period_end date not null,
  marked_undelivered boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists goal_deferrals_goal_idx
  on public.goal_deferrals (goal_id, created_at desc);

alter table public.goal_deferrals enable row level security;

drop policy if exists goal_deferrals_all on public.goal_deferrals;
create policy goal_deferrals_all on public.goal_deferrals
  for all using (true) with check (true);
