-- Jawne uprawnienia API + przeładowanie cache PostgREST (po migracji 117)

grant all on table public.project_functionality_surveys to anon, authenticated, service_role;
grant all on table public.project_functionality_responses to anon, authenticated, service_role;
grant all on table public.project_functionality_tasks to anon, authenticated, service_role;

notify pgrst, 'reload schema';
