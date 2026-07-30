-- D44 krok 5a — powiadomienia zwrotne do zglaszajacego.
--
-- Wysylane TRIGGEREM, nie z UI. Powod ten sam, co przy wymuszaniu closure_reason: status
-- ustalenia albo zmiany zmienia sie wieloma sciezkami (panel zespolu, odpowiedz klienta z panelu
-- publicznego, akcje zbiorcze, API). Wpiecie powiadomien w jedno z tych miejsc znaczyloby, ze
-- pozostale ciche zamykaja temat — a cicha odmowa to dokladnie to, przed czym ta funkcja broni.
--
-- Zglaszajacy, ktory nie dowiaduje sie, dlaczego nic z tego nie wyszlo, uczy sie, ze jego
-- zgloszenia znikaja. Trzy takie przypadki i przestaje zglaszac, bez slowa.

alter table user_notifications drop constraint user_notifications_kind_check;
alter table user_notifications add constraint user_notifications_kind_check check (
  kind = any (array[
    'kanban_mention','kanban_new_activity','warranty_expiring','agreement_client_created',
    'client_stage_rating','service_intake_preliminary_offer','service_intake_assigned',
    'inspection_billing_due','goal_review_due','goal_period_ending','goal_at_risk',
    'goal_recurring_created','leave_request_created','leave_request_decided',
    'monthly_review_self_submitted','client_offer_accepted','settlement_offer_accepted',
    'client_offer_expiring','work_item_assigned','work_item_sent','work_item_changed',
    'work_item_acceptance_needed','work_item_obstacle_reported','work_item_overdue',
    'work_item_verification_needed','work_item_takeover_requested','change_request_client_responded',
    'offer_approval_requested','offer_approval_reviewed','agreement_client_responded',
    'service_intake_submitted','service_intake_status','chat_mention','chat_message',
    'chat_room_invite','commitment_window_warning','commitment_unavailable_warning',
    'leave_commitment_impact',
    -- D44:
    'employee_report_classified',      -- manager wypchnal szkic dalej
    'employee_report_accepted',        -- klient zaakceptowal
    'employee_report_completed',       -- wykonane
    'employee_report_closed',          -- zamkniete BEZ dzialania, z powodem
    'employee_report_urgent'           -- pilne -> koordynator techniczny, natychmiast
  ])
);

create or replace function public.notify_employee_report_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_title text;
  v_body text;
  v_link text;
begin
  -- Bez autora nie ma komu odpisac. Dopasowanie po created_by_name odpada: dwie osoby o tym samym
  -- nazwisku i odmowa trafia do niewlasciwej, co jest gorsze niz cisza.
  if new.created_by_id is null then
    return new;
  end if;

  if tg_argv[0] = 'agreement' then
    v_link := '/projekty/' || new.project_id::text || '?ustalenie=' || new.id::text;
  else
    v_link := '/projekty/' || new.project_id::text || '?zmiana=' || new.id::text;
  end if;

  -- Wykonane — jedyne zdarzenie liczone po dacie, nie po statusie (os wykonania jest osobna).
  if new.completed_at is not null and old.completed_at is null then
    v_kind := 'employee_report_completed';
    v_title := 'Wykonano: ' || new.title;
    v_body := coalesce(nullif(btrim(new.completion_note), ''), 'Zgloszenie zostalo zrealizowane.');

  elsif new.status::text is distinct from old.status::text then
    if new.status::text in ('cancelled', 'rejected') then
      v_kind := 'employee_report_closed';
      v_title := 'Zamkniete bez dzialania: ' || new.title;
      -- closure_reason jest wymuszony osobnym triggerem, wiec tutaj zawsze cos jest.
      v_body := coalesce(nullif(btrim(new.closure_reason), ''), 'Brak podanego powodu.');
    elsif new.status::text = 'accepted' then
      v_kind := 'employee_report_accepted';
      v_title := 'Klient zaakceptowal: ' || new.title;
      v_body := 'Twoje zgloszenie zostalo zaakceptowane przez klienta.';
    elsif old.status::text = 'draft' then
      v_kind := 'employee_report_classified';
      v_title := 'Sklasyfikowano: ' || new.title;
      v_body := 'Twoje zgloszenie zostalo przyjete i idzie dalej.';
    else
      return new;
    end if;
  else
    return new;
  end if;

  insert into user_notifications (id, profile_id, kind, title, body, link_url, source_id, created_at)
  values (gen_random_uuid(), new.created_by_id, v_kind, v_title, v_body, v_link, new.id::text, now());

  return new;
end $$;

create trigger project_client_agreements_notify_author
  after update on project_client_agreements
  for each row execute function notify_employee_report_author('agreement');

create trigger project_change_requests_notify_author
  after update on project_change_requests
  for each row execute function notify_employee_report_author('change_request');

-- Pilne -> koordynator techniczny, natychmiast po utworzeniu ------------------
-- Odbiorca ze slotu na projekcie. Gdy slot pusty, idziemy lancuchem role_fallback, zeby
-- powiadomienie nie przepadlo tylko dlatego, ze ktos nie obsadzil roli.
create or replace function public.notify_urgent_employee_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_link text;
begin
  if not new.is_urgent then
    return new;
  end if;

  with recursive slots as (
    select prs.role_code, prs.user_id
    from project_role_slot prs
    where prs.project_id = new.project_id and prs.to_date is null
  ),
  chain (cur_role, depth, path) as (
    select 'koordynator_techniczny'::text, 0, array['koordynator_techniczny'::text]
    union all
    select f.fallback_role_code, c.depth + 1, c.path || f.fallback_role_code
    from chain c
    join role_fallback f on f.role_code = c.cur_role
    left join slots s0 on s0.role_code = c.cur_role
    where c.depth < 5 and s0.user_id is null
      and not (f.fallback_role_code = any(c.path))
  )
  select s.user_id into v_user
  from chain c join slots s on s.role_code = c.cur_role
  order by c.depth
  limit 1;

  if v_user is null then
    return new;
  end if;

  if tg_argv[0] = 'agreement' then
    v_link := '/projekty/' || new.project_id::text || '?ustalenie=' || new.id::text;
  else
    v_link := '/projekty/' || new.project_id::text || '?zmiana=' || new.id::text;
  end if;

  insert into user_notifications (id, profile_id, kind, title, body, link_url, source_id, created_at)
  values (gen_random_uuid(), v_user, 'employee_report_urgent',
          'PILNE zgloszenie: ' || new.title,
          coalesce(nullif(btrim(new.body), ''), 'Zgloszone jako pilne z budowy.') ||
          ' (zglosil: ' || new.created_by_name || ')',
          v_link, new.id::text, now());

  return new;
end $$;

create trigger project_client_agreements_notify_urgent
  after insert on project_client_agreements
  for each row execute function notify_urgent_employee_report('agreement');

create trigger project_change_requests_notify_urgent
  after insert on project_change_requests
  for each row execute function notify_urgent_employee_report('change_request');

-- Asercje --------------------------------------------------------------------
-- Blok z klauzula EXCEPTION tworzy podtransakcje, wiec wyjatek na koncu wycofuje WSZYSTKIE
-- wstawione wiersze testowe. Zweryfikowane po wdrozeniu: 0 wierszy 'ASERCJA%', 0 powiadomien.
do $$
declare
  v_projekt uuid; v_osoba uuid; v_id uuid; v_powiadomien integer; v_tresc text;
begin
  select p.id into v_projekt from projects p
   where exists (select 1 from project_role_slot prs
                  where prs.project_id = p.id and prs.role_code='koordynator_techniczny' and prs.to_date is null)
   limit 1;
  select prs.user_id into v_osoba from project_role_slot prs
   where prs.project_id = v_projekt and prs.role_code='opiekun_projektu' and prs.to_date is null limit 1;

  -- 1. pilne zgloszenie ma powiadomic koordynatora technicznego
  insert into project_client_agreements (project_id, title, created_by_name, created_by_id, is_urgent)
  values (v_projekt, 'ASERCJA pilne', 'Test', v_osoba, true) returning id into v_id;
  select count(*) into v_powiadomien from user_notifications
   where source_id = v_id::text and kind = 'employee_report_urgent';
  if v_powiadomien <> 1 then
    raise exception 'Pilne zgloszenie nie powiadomilo koordynatora (%)', v_powiadomien;
  end if;

  -- 2. zamkniecie bez dzialania ma wrocic do zglaszajacego Z POWODEM
  update project_client_agreements
     set status = 'cancelled', closure_reason = 'Poza zakresem umowy, klient tego nie zamawial.'
   where id = v_id;
  select body into v_tresc from user_notifications
   where source_id = v_id::text and kind = 'employee_report_closed';
  if v_tresc is null then
    raise exception 'Zamkniecie bez dzialania NIE wrocilo do zglaszajacego';
  end if;
  if v_tresc not like '%klient tego nie zamawial%' then
    raise exception 'Powiadomienie nie niesie powodu (tresc: %)', v_tresc;
  end if;

  -- 3. brak autora = brak powiadomienia, nie blad
  insert into project_client_agreements (project_id, title, created_by_name, created_by_id)
  values (v_projekt, 'ASERCJA bez autora', 'Test', null) returning id into v_id;
  update project_client_agreements set status='cancelled', closure_reason='x' where id = v_id;
  select count(*) into v_powiadomien from user_notifications where source_id = v_id::text;
  if v_powiadomien <> 0 then
    raise exception 'Zgloszenie bez autora wygenerowalo powiadomienie (%)', v_powiadomien;
  end if;

  raise exception 'ROLLBACK ASERCJI — wszystkie trzy przypadki przeszly';
exception when others then
  if sqlerrm <> 'ROLLBACK ASERCJI — wszystkie trzy przypadki przeszly' then
    raise;
  end if;
  raise notice 'OK: pilne powiadamia, odmowa wraca z powodem, brak autora nie wybucha.';
end $$;
