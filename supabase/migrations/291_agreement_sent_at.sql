alter table public.project_client_agreements
  add column if not exists sent_at timestamptz;

comment on column public.project_client_agreements.sent_at is
  'Ostatnia wysylka pakietowa/przypomnienia (Ustalenia -> Wyslij paczke do akceptacji / Przypomnij o akceptacjach). NULL = nigdy nie ujete w takiej wysylce.';
