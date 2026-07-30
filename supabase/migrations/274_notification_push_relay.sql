-- D44 — przekaznik pusha dla powiadomien tworzonych w bazie.
--
-- Powiadomienia D44 powstaja TRIGGEREM (zeby zadna sciezka zmiany statusu nie zamknela tematu po
-- cichu), a warstwa wysylajaca push zyje w TypeScripcie. Trigger jej nie wola, wiec push nigdy nie
-- szedl. Zamiast przenosic tworzenie do TS i tracic te gwarancje — dokladamy przekaznik: cron
-- czyta niewyslane wiersze i dosyla push.
--
-- Cena: opoznienie do jednego przebiegu crona. Swiadoma, bo alternatywa oznaczalaby, ze kazda
-- przyszla sciezka zmieniajaca status musi PAMIETAC o wywolaniu wysylki — a to jest dokladnie
-- ten rodzaj obowiazku, ktory ktos kiedys pominie.
alter table user_notifications add column pushed_at timestamptz;

comment on column user_notifications.pushed_at is
  'D44 — kiedy dla tego powiadomienia wyslano push. NULL = jeszcze nie probowano. Ustawiane takze '
  'przy braku subskrypcji, zeby cron nie probowal w kolko tego samego wiersza.';

create index user_notifications_unpushed_idx
  on user_notifications (created_at)
  where pushed_at is null;

-- Istniejace powiadomienia oznaczamy jako obsluzone. Bez tego pierwszy przebieg crona wyslalby
-- push do wszystkiego, co kiedykolwiek powstalo — lacznie z rzeczami sprzed miesiecy.
update user_notifications set pushed_at = created_at where pushed_at is null;

do $$
declare
  v_niewyslane integer;
begin
  select count(*) into v_niewyslane from user_notifications where pushed_at is null;
  if v_niewyslane <> 0 then
    raise exception 'Po backfillu zostalo % niewyslanych — cron zalalby ludzi historia', v_niewyslane;
  end if;
  raise notice 'OK: kolumna dodana, historia oznaczona jako obsluzona.';
end $$;
