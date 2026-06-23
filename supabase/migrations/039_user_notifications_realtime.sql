-- Realtime: odświeżanie badge powiadomień i alertów Kanban na żywo

alter table public.user_notifications replica identity full;
alter table public.process_kanban_tasks replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.user_notifications;
    alter publication supabase_realtime add table public.process_kanban_tasks;
  end if;
exception
  when duplicate_object then null;
end $$;
