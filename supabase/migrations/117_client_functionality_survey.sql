-- Ankieta funkcjonalności klienta przed wdrożeniem

alter table public.specification_catalog_items
  add column if not exists client_functionality_items jsonb not null default '[]'::jsonb;

do $$ begin
  create type public.functionality_survey_status as enum (
    'draft',
    'sent',
    'in_progress',
    'completed'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.functionality_task_status as enum (
    'todo',
    'in_progress',
    'done'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.functionality_task_source as enum (
    'template',
    'ai',
    'manual'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.functionality_task_priority as enum (
    'must',
    'standard',
    'optional'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.project_functionality_surveys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  public_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status public.functionality_survey_status not null default 'draft',
  ai_suggestions jsonb not null default '[]'::jsonb,
  extra_questions jsonb not null default '[]'::jsonb,
  client_name text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create index if not exists project_functionality_surveys_project_id_idx
  on public.project_functionality_surveys (project_id);

create index if not exists project_functionality_surveys_public_token_idx
  on public.project_functionality_surveys (public_token);

create table if not exists public.project_functionality_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.project_functionality_surveys (id) on delete cascade,
  question_id text not null,
  catalog_item_id uuid references public.specification_catalog_items (id) on delete set null,
  selected_option_ids jsonb not null default '[]'::jsonb,
  custom_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (survey_id, question_id)
);

create index if not exists project_functionality_responses_survey_id_idx
  on public.project_functionality_responses (survey_id);

create table if not exists public.project_functionality_tasks (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.project_functionality_surveys (id) on delete cascade,
  question_id text,
  option_id text,
  title text not null,
  description text not null default '',
  category text not null default 'Ogólne',
  priority public.functionality_task_priority not null default 'standard',
  status public.functionality_task_status not null default 'todo',
  source public.functionality_task_source not null default 'template',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_functionality_tasks_survey_id_idx
  on public.project_functionality_tasks (survey_id);

alter table public.project_functionality_surveys enable row level security;
alter table public.project_functionality_responses enable row level security;
alter table public.project_functionality_tasks enable row level security;

drop policy if exists "project_functionality_surveys_all" on public.project_functionality_surveys;
drop policy if exists "project_functionality_responses_all" on public.project_functionality_responses;
drop policy if exists "project_functionality_tasks_all" on public.project_functionality_tasks;

create policy "project_functionality_surveys_all" on public.project_functionality_surveys for all using (true) with check (true);
create policy "project_functionality_responses_all" on public.project_functionality_responses for all using (true) with check (true);
create policy "project_functionality_tasks_all" on public.project_functionality_tasks for all using (true) with check (true);
