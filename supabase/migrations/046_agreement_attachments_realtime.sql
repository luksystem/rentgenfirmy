-- Realtime: synchronizacja załączników ustaleń

alter table public.project_agreement_attachments replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.project_agreement_attachments;
  end if;
exception
  when duplicate_object then null;
end $$;
