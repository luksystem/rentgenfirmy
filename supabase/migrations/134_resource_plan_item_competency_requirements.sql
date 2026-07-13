-- ═══════════════════════════════════════════════════════════════════════════
-- Plan Zasobów — wymagane kompetencje na elemencie planu (przydziale).
-- Źródło dla walidacji i sugestii osób (porównanie z user_competencies).
-- Szablony elementu planu przechowują te same wymagania w metadata.requiredCompetencies.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.resource_plan_item_competency_requirements (
  id uuid primary key default gen_random_uuid(),
  plan_item_id uuid not null references public.resource_plan_items (id) on delete cascade,
  competency_item_id uuid not null references public.resource_dictionary_items (id) on delete cascade,
  min_level_item_id uuid references public.resource_dictionary_items (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (plan_item_id, competency_item_id)
);

create index if not exists resource_plan_item_competency_requirements_item_idx
  on public.resource_plan_item_competency_requirements (plan_item_id);

alter table public.resource_plan_item_competency_requirements enable row level security;

drop policy if exists resource_plan_item_competency_requirements_select
  on public.resource_plan_item_competency_requirements;
create policy resource_plan_item_competency_requirements_select
  on public.resource_plan_item_competency_requirements for select
  using (auth.uid() is not null);

drop policy if exists resource_plan_item_competency_requirements_write
  on public.resource_plan_item_competency_requirements;
create policy resource_plan_item_competency_requirements_write
  on public.resource_plan_item_competency_requirements for all
  using (public.has_full_app_access())
  with check (public.has_full_app_access());
