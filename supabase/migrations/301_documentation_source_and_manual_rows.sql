-- Pozwala odróżnić pozycje pochodzące z importu pliku od pozycji dodanych ręcznie w Rentgenie
-- (użytkownik: "dobrze zeby w kazdym arkuszu z poziomu rengena mozna bylo dodac wlasny wiersz").
-- Ręcznie dodane pozycje nigdy nie są oznaczane jako `is_stale` przy ponownym imporcie pliku —
-- import w ogóle o nich nie wie (inny merge_key), więc bez tej flagi trzeba by je jakoś odróżnić
-- od "zniknęły z pliku"; z flagą repozytorium po prostu pomija je przy liczeniu stale.

alter table public.switchboard_circuits
  add column if not exists source text not null default 'import' check (source in ('import', 'manual'));

alter table public.documentation_module_items
  add column if not exists source text not null default 'import' check (source in ('import', 'manual'));
