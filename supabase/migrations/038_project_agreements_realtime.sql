-- Realtime: synchronizacja ustaleń między dashboardem klienta a zespołu

alter table public.project_client_agreements replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.project_client_agreements;
  end if;
exception
  when duplicate_object then null;
end $$;
