-- Po migracji 117: odśwież cache PostgREST (Supabase API), żeby nowe tabele były widoczne od razu.
notify pgrst, 'reload schema';
