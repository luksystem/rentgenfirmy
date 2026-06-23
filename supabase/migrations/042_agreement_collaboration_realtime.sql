-- Realtime: synchronizacja akceptacji wielorolowych i komentarzy ustaleń

alter table public.project_agreement_approvals replica identity full;
alter table public.project_agreement_comments replica identity full;
alter table public.project_agreement_versions replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.project_agreement_approvals;
    alter publication supabase_realtime add table public.project_agreement_comments;
    alter publication supabase_realtime add table public.project_agreement_versions;
  end if;
exception
  when duplicate_object then null;
end $$;
