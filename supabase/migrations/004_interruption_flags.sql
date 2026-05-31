alter table public.interruptions
  add column if not exists was_necessary boolean not null default false,
  add column if not exists is_recurring boolean not null default false;
