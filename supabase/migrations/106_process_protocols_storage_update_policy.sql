-- Naprawa: "pisanie po PDF" (odręczne adnotacje) w protokole procesu zapisuje PNG
-- do bucketu process-protocols z `upsert: true`. Gdy plik na danej stronie już
-- istnieje (druga i kolejne linie pisma na tej samej stronie), Supabase Storage
-- wykonuje UPDATE, a nie INSERT — brakowało dla niego polityki RLS, co dawało
-- błąd "new row violates row-level security policy" i utratę odręcznych zmian
-- (tylko pola tekstowe, zapisywane osobno do tabeli, przechodziły poprawnie).

drop policy if exists "process_protocols_update" on storage.objects;

create policy "process_protocols_update"
  on storage.objects for update
  using (bucket_id = 'process-protocols')
  with check (bucket_id = 'process-protocols');
