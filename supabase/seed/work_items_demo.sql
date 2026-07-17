-- Seed demonstracyjny modułu Moja praca → Zadania
-- Wymaga istniejących profili w tabeli profiles (administrator, manager, pracownik).
-- Uruchom ręcznie po migracjach 120–122, gdy masz co najmniej 2 aktywnych użytkowników.

do $$
declare
  v_manager_id uuid;
  v_worker_a_id uuid;
  v_worker_b_id uuid;
  v_manual_sent_id uuid := gen_random_uuid();
  v_manual_progress_id uuid := gen_random_uuid();
  v_manual_blocked_id uuid := gen_random_uuid();
begin
  select id into v_manager_id from public.profiles where role in ('administrator', 'manager') and is_active limit 1;
  select id into v_worker_a_id from public.profiles where role = 'instalator' and is_active order by created_at limit 1;
  select id into v_worker_b_id from public.profiles where role = 'instalator' and is_active order by created_at offset 1 limit 1;

  if v_manager_id is null or v_worker_a_id is null then
    raise notice 'Pominięto seed work_items — brak profili manager/pracownik.';
    return;
  end if;

  insert into public.work_items (
    id, source_type, assigned_user_id, created_by_id, manager_id,
    title, description, expected_result, completion_criteria,
    due_date, priority, status, sent_at, blocked_reason
  ) values
    (
      v_manual_sent_id, 'manual', v_worker_a_id, v_manager_id, v_manager_id,
      'Podłącz czujniki temperatury na piętrze',
      'Montaż i sprawdzenie czujników w strefie A.',
      'Wszystkie czujniki raportują poprawne odczyty w panelu.',
      'Test połączenia + zdjęcie rozdzielni.',
      (current_date + interval '1 day')::date,
      'high', 'pending_ack', now(), ''
    ),
    (
      v_manual_progress_id, 'manual', v_worker_a_id, v_manager_id, v_manager_id,
      'Aktualizacja dokumentacji projektu',
      'Uzupełnij schemat po ostatnich zmianach.',
      'Dokumentacja zgodna z stanem rzeczywistym.',
      'Manager zatwierdził wersję w module dokumentów.',
      (current_date + interval '3 day')::date,
      'normal', 'in_progress', now() - interval '2 day', ''
    ),
    (
      v_manual_blocked_id, 'manual', v_worker_a_id, v_manager_id, v_manager_id,
      'Kalibracja czujników wilgotności',
      'Wymaga dodatkowych sond.',
      'Poprawne odczyty po kalibracji.',
      'Raport z kalibracji w załączniku.',
      current_date,
      'urgent', 'blocked', now() - interval '1 day',
      'Brak materiałów — oczekujemy dostawy sond.'
    )
  on conflict do nothing;

  insert into public.work_item_acceptances (
    id, work_item_id, user_id, action, comment, due_date_at_acceptance, accepted_without_reservations
  ) values (
    gen_random_uuid(), v_manual_progress_id, v_worker_a_id, 'accept',
    'Zapoznałem się z zadaniem.', (current_date + interval '3 day')::date, true
  ) on conflict do nothing;

  insert into public.work_item_comments (
    id, work_item_id, author_id, author_name, body
  )
  select gen_random_uuid(), v_manual_blocked_id, v_worker_a_id,
    coalesce(p.first_name || ' ' || p.last_name, 'Pracownik'),
    'Zgłaszam brak sond — proszę o informację kiedy dostawa.'
  from public.profiles p where p.id = v_worker_a_id
  on conflict do nothing;

  insert into public.work_item_logs (id, work_item_id, user_id, action, metadata)
  values
    (gen_random_uuid(), v_manual_sent_id, v_manager_id, 'created_and_sent', '{}'::jsonb),
    (gen_random_uuid(), v_manual_progress_id, v_worker_a_id, 'acceptance:accept', '{"comment":""}'::jsonb)
  on conflict do nothing;

  raise notice 'Seed work_items_demo zakończony dla pracownika %', v_worker_a_id;
end $$;
