-- D44 poprawka — linki w powiadomieniach prowadzily na 404.
--
-- Zgadlem sciezke `/projekty/{id}`, a taka strona nie istnieje: pod app/projekty/[id] jest tylko
-- podkatalog `proces`. Widok zespolu dla projektu to przestrzen klienta:
--   /przestrzenie/klient/{clientId}?project={projectId}&tab={agreements|changes}
-- gdzie tab jest odczytywany jako ClientDashboardTab, a `agreement` ustawia focus na konkretnej
-- pozycji (dla zmian projektowych analogicznego parametru jeszcze nie ma, wiec link celuje
-- w zakladke).
--
-- Wniosek na przyszlosc: link w powiadomieniu to kontrakt z routingiem aplikacji i nie wolno go
-- pisac z pamieci. Tu kosztowalo cztery martwe powiadomienia u wlasciciela.
create or replace function public.employee_report_link(
  p_project_id uuid,
  p_record_id uuid,
  p_is_agreement boolean
)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when p.client_id is null then '/klienci'
    when p_is_agreement then
      '/przestrzenie/klient/' || p.client_id::text ||
      '?project=' || p_project_id::text || '&tab=agreements&agreement=' || p_record_id::text
    else
      '/przestrzenie/klient/' || p.client_id::text ||
      '?project=' || p_project_id::text || '&tab=changes'
  end
  from projects p where p.id = p_project_id;
$$;

-- Oba triggery przechodza na employee_report_link zamiast sklejac sciezke lokalnie.
-- Pelne cialo funkcji jest identyczne jak w migracji 271, zmieniona jest wylacznie budowa linku.
create or replace function public.notify_employee_report_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text; v_title text; v_body text; v_link text;
begin
  if new.created_by_id is null then
    return new;
  end if;

  v_link := employee_report_link(new.project_id, new.id, tg_argv[0] = 'agreement');

  if new.completed_at is not null and old.completed_at is null then
    v_kind := 'employee_report_completed';
    v_title := 'Wykonano: ' || new.title;
    v_body := coalesce(nullif(btrim(new.completion_note), ''), 'Zgloszenie zostalo zrealizowane.');
  elsif new.status::text is distinct from old.status::text then
    if new.status::text in ('cancelled', 'rejected') then
      v_kind := 'employee_report_closed';
      v_title := 'Zamkniete bez dzialania: ' || new.title;
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

create or replace function public.notify_urgent_employee_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
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
  order by c.depth limit 1;

  if v_user is null then
    return new;
  end if;

  insert into user_notifications (id, profile_id, kind, title, body, link_url, source_id, created_at)
  values (gen_random_uuid(), v_user, 'employee_report_urgent',
          'PILNE zgloszenie: ' || new.title,
          coalesce(nullif(btrim(new.body), ''), 'Zgloszone jako pilne z budowy.') ||
          ' (zglosil: ' || new.created_by_name || ')',
          employee_report_link(new.project_id, new.id, tg_argv[0] = 'agreement'),
          new.id::text, now());
  return new;
end $$;

-- Naprawa juz wyslanych powiadomien — cztery martwe linki u wlasciciela.
update user_notifications n
   set link_url = employee_report_link(c.project_id, c.id, false)
  from project_change_requests c
 where n.source_id = c.id::text
   and n.kind like 'employee_report%'
   and n.link_url like '/projekty/%';

update user_notifications n
   set link_url = employee_report_link(a.project_id, a.id, true)
  from project_client_agreements a
 where n.source_id = a.id::text
   and n.kind like 'employee_report%'
   and n.link_url like '/projekty/%';

do $$
declare
  v_martwych integer; v_poprawnych integer;
begin
  select count(*) into v_martwych from user_notifications
   where kind like 'employee_report%' and link_url like '/projekty/%';
  select count(*) into v_poprawnych from user_notifications
   where kind like 'employee_report%' and link_url like '/przestrzenie/klient/%';

  if v_martwych <> 0 then
    raise exception 'Zostalo % martwych linkow', v_martwych;
  end if;
  if v_poprawnych = 0 then
    raise exception 'Zaden link nie zostal naprawiony — sprawdz warunek';
  end if;
  raise notice 'OK: naprawiono % linkow, 0 martwych.', v_poprawnych;
end $$;
