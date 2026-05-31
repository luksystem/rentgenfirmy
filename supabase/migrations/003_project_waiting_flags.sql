alter table public.projects
  add column if not exists waiting_depends_on_us boolean not null default false,
  add column if not exists waiting_increases_cost_later boolean not null default false,
  add column if not exists waiting_blocks_settlement boolean not null default false;
