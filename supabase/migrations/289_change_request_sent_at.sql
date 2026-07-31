alter table public.project_change_requests
  add column if not exists sent_at timestamptz;

comment on column public.project_change_requests.sent_at is
  'Ostatnia wysylka pakietowa/przypomnienia (Zmiany projektu -> Wyslij paczke do akceptacji / Przypomnij o akceptacjach). NULL = nigdy nie ujeta w takiej wysylce, mimo ze moze byc juz pending_client przez pojedyncze zgloszenie.';
