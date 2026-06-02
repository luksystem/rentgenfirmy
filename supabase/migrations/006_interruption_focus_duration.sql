-- Skupienie, czas trwania, opcjonalny opis i projekt

alter table public.interruptions
  drop constraint if exists interruptions_project_id_fkey;

alter table public.interruptions
  alter column project_id drop not null,
  alter column description drop not null,
  alter column description set default '';

alter table public.interruptions
  add column if not exists duration_minutes integer
    check (duration_minutes is null or duration_minutes >= 0),
  add column if not exists kind text not null default 'interruption'
    check (kind in ('interruption', 'focus'));

update public.interruptions
set description = coalesce(description, '')
where description is null;

alter table public.interruptions
  add constraint interruptions_project_id_fkey
    foreign key (project_id) references public.projects (id) on delete set null;

create index if not exists interruptions_kind_idx on public.interruptions (kind);
