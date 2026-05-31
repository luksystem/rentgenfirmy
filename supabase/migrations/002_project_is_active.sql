-- Uruchom w Supabase SQL Editor dla istniejącej bazy

alter table public.projects
  add column if not exists is_active boolean not null default false;

update public.projects
set is_active = true
where flow_status = 'Aktywny';
