-- Faza 13 Krok 1 (docs/role/04 §3.1 + korekta wlasciciela) - project_role_competency.
--
-- Osobna tabela od operational_role_competency (D21/D22): tamta klucz na resource_dictionary_items
-- (dictionary_key='operational_role', 5 wartosci typu "Instalator/Programista/Serwisant"),
-- ta na role.code (9 kodow D10 / project_role_slot). Dwie rozne osie "rola", swiadomie nie scalane.
--
-- Pusty wymog = brak wymogu = kazdy przechodzi filtr (decyzja wlasciciela) - odwrotnosc nigdy nie
-- zachodzi: pusta tabela nie moze zablokowac wszystkich zastepstw w dniu wdrozenia.
create table public.project_role_competency (
  id uuid primary key default gen_random_uuid(),
  role_code text not null references public.role (code),
  competency_item_id uuid not null references public.resource_dictionary_items (id),
  min_level_item_id uuid references public.resource_dictionary_items (id),
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (role_code, competency_item_id)
);

create index project_role_competency_role_idx on public.project_role_competency (role_code);
create index project_role_competency_competency_idx on public.project_role_competency (competency_item_id);

comment on table public.project_role_competency is
  'Wymagane kompetencje per slot projektowy (/docs/role/04 §3.1, Faza 13 Krok 1). Klucz na role.code, '
  'NIE na resource_dictionary_items dictionary_key=operational_role (ta os to operational_role_competency, '
  'D21/D22 - inny mechanizm, inny konsument). Brak wiersza dla (rola, kompetencja) = brak wymogu.';

alter table public.project_role_competency enable row level security;

create policy project_role_competency_select on public.project_role_competency
  for select using (auth.uid() is not null);

create policy project_role_competency_write on public.project_role_competency
  for all using (has_full_app_access()) with check (has_full_app_access());

-- Seed zatwierdzony przez wlasciciela (docs/08 D48): TYLKO trzy wiersze, celowo waskie.
-- "Wymog twardy ma znaczyc 'bez tego zastepstwo jest niebezpieczne', nie 'tak wyglada idealny
-- kandydat'. Reszta jest od sortowania." Sprawdzone przed seedem (docs/08 D48): 10/11 osob ma
-- wpisy kompetencji, zaden profil nie jest pusty.
--
-- Mapowanie "programowanie" -> Loxone (wlasciciel zatwierdzil, docs/08 D48): "Wasze uruchomienia to
-- konfiguracja Loxone, nie programowanie ogolne - nazwa ma opisywac rzeczywistosc".
do $$
declare
  v_loxone_id uuid;
  v_komunikacja_id uuid;
  v_ekspert_id uuid;
  v_senior_id uuid;
  v_regular_id uuid;
  v_expected constant int := 3;
  v_actual int;
begin
  select id into v_loxone_id from public.resource_dictionary_items
    where dictionary_key = 'competency' and name = 'Loxone';
  select id into v_komunikacja_id from public.resource_dictionary_items
    where dictionary_key = 'competency' and name = 'Komunikacja z klientem';
  select id into v_ekspert_id from public.resource_dictionary_items
    where dictionary_key = 'competency_level' and name = 'Ekspert';
  select id into v_senior_id from public.resource_dictionary_items
    where dictionary_key = 'competency_level' and name = 'Senior';
  select id into v_regular_id from public.resource_dictionary_items
    where dictionary_key = 'competency_level' and name = 'Regular';

  if v_loxone_id is null or v_komunikacja_id is null
     or v_ekspert_id is null or v_senior_id is null or v_regular_id is null then
    raise exception 'project_role_competency seed: brakuje pozycji slownika (competency/competency_level)';
  end if;

  insert into public.project_role_competency (role_code, competency_item_id, min_level_item_id, is_required)
  values
    ('wdrozeniowiec', v_loxone_id, v_ekspert_id, true),
    ('koordynator_techniczny', v_loxone_id, v_senior_id, true),
    ('opiekun_projektu', v_komunikacja_id, v_regular_id, true);

  get diagnostics v_actual = row_count;
  if v_actual != v_expected then
    raise exception 'project_role_competency seed: oczekiwano % wierszy, wstawiono %', v_expected, v_actual;
  end if;
end $$;
