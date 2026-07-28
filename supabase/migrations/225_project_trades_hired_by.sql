-- Faza 4 (ROT) - Macierz Interfejsow: rozszerzenie istniejacej zakladki "Wykonawcy" (project_trades)
-- o pole "kto zatrudnia" (docs/08, dopisac do decyzji ROT). Wolny tekst, tak jak name/company/
-- contact_name - ten sam styl co reszta tabeli, bez nowego slownika (nikt nie prosil o kontrolowana
-- liste podmiotow zatrudniajacych, a wymyslanie jej teraz byloby nadmiarowe).
alter table public.project_trades
  add column hired_by text not null default '';

comment on column public.project_trades.hired_by is
  'Kto zatrudnia tego wykonawce (np. "Inwestor", "Generalny wykonawca", konkretna firma) - Macierz Interfejsow.';
