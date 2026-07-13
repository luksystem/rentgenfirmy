-- Realtime: synchronizacja dashboardu zespołu po zmianach klienta w publicznym linku
-- (branże, ocena spełnienia, ankieta funkcjonalności)

alter table public.project_trades replica identity full;
alter table public.project_agreement_fulfillments replica identity full;
alter table public.project_specification_fulfillments replica identity full;
alter table public.project_stage_satisfactions replica identity full;
alter table public.project_satisfaction_overviews replica identity full;
alter table public.project_functionality_surveys replica identity full;
alter table public.project_functionality_responses replica identity full;
alter table public.project_functionality_tasks replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.project_trades;
    alter publication supabase_realtime add table public.project_agreement_fulfillments;
    alter publication supabase_realtime add table public.project_specification_fulfillments;
    alter publication supabase_realtime add table public.project_stage_satisfactions;
    alter publication supabase_realtime add table public.project_satisfaction_overviews;
    alter publication supabase_realtime add table public.project_functionality_surveys;
    alter publication supabase_realtime add table public.project_functionality_responses;
    alter publication supabase_realtime add table public.project_functionality_tasks;
  end if;
exception
  when duplicate_object then null;
end $$;
