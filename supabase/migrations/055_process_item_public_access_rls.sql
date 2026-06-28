-- RLS dla publicznego dostępu do elementów procesu (053 utworzyła tabelę bez polityk).

alter table public.project_process_item_public_access enable row level security;

drop policy if exists project_process_item_public_access_all on public.project_process_item_public_access;
create policy project_process_item_public_access_all
  on public.project_process_item_public_access
  for all
  using (true)
  with check (true);
