-- Faza 2 — Sloty ról na projekcie (/docs/04 §1-2, docs/08 D4/D7, korekty właściciela).
--
-- lider_montazu i instalator NIE wchodzą do project_role_slot (dane, nie CHECK — patrz
-- role.uses_project_slot poniżej): lider_montazu żyje w project_stage_leads (faza 1),
-- instalator w Planie Zasobów (04 §9). Oba zostają w słowniku role (macierz z 02§10
-- używa LM w etapach 7-8) i w role_fallback (routing zastępstw), ale nigdy jako slot.

create table if not exists public.role (
  code text primary key,
  name text not null,
  description text not null default '',
  is_client_facing boolean not null default false,
  max_holders int not null default 1,
  uses_project_slot boolean not null default true,
  created_at timestamptz not null default now()
);

-- Trik złożonego FK: wykluczenie roli ze slotów to teraz dane (update role
-- set uses_project_slot = false), nie migracja schematu.
alter table public.role
  add constraint role_code_uses_slot_uq unique (code, uses_project_slot);

comment on column public.role.uses_project_slot is
  'false = rola nie ma bytu w project_role_slot (dziś: lider_montazu, instalator — patrz komentarz '
  'nagłówkowy tej migracji). Dane, nie CHECK na kodach — dodanie nowej roli nieslotowej to update, nie migracja.';

insert into public.role (code, name, is_client_facing, max_holders, uses_project_slot) values
  ('wlasciciel', 'Właściciel', true, 1, true),
  ('opiekun_projektu', 'Opiekun Projektu', true, 1, true),
  ('koordynator_operacyjny', 'Koordynator Operacyjny', true, 1, true),
  ('koordynator_techniczny', 'Koordynator Techniczny', true, 1, true),
  ('projektant', 'Projektant', true, 1, true),
  ('wdrozeniowiec', 'Wdrożeniowiec', true, 1, true),
  ('lider_montazu', 'Lider Montażu', false, 1, false),
  ('instalator', 'Instalator', false, 0, false),
  ('asystent_procesu', 'Asystent Procesu', false, 1, true)
on conflict (code) do nothing;

create table if not exists public.project_role_slot (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  role_code text not null,
  uses_project_slot boolean not null generated always as (true) stored,
  user_id uuid not null references public.profiles (id),
  from_date date not null default current_date,
  to_date date,
  source text not null check (source in ('obsada', 'fallback', 'zastepstwo', 'przejecie_czerwone')),
  source_ref text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint project_role_slot_role_fk
    foreign key (role_code, uses_project_slot) references public.role (code, uses_project_slot)
);

comment on table public.project_role_slot is
  'Slot roli procesowej na projekcie (/docs/04 §2). Rola to slot na projekcie, nie pole na użytkowniku. '
  'uses_project_slot jest zawsze true na tym wierszu — złożony FK do role(code, uses_project_slot) '
  'gwarantuje, że tylko role z role.uses_project_slot=true mogą tu trafić.';
comment on column public.project_role_slot.source_ref is
  'Wolny tekst z kontekstem źródła. Dla wierszy backfillowanych z podejrzanego zbioru (docs/08 D15) '
  'zawiera literalnie ''d15_migration'' — odróżnia "nigdy nie obsadzone" od "wyzerowane przez bug".';

-- Dokładnie jeden aktywny slot na (projekt, rola) — obejmuje "dokładnie jeden opiekun_projektu"
-- z /docs/04 §2.1 jako szczególny przypadek ogólnej reguły: wszystkie role dopuszczone do tej
-- tabeli mają dziś max_holders=1 (lider_montazu/instalator wykluczone wyżej). Jeśli kiedyś dojdzie
-- rola wieloosobowa dopuszczona do project_role_slot, ten indeks trzeba uwarunkować przez role.max_holders.
create unique index if not exists project_role_slot_single_active_idx
  on public.project_role_slot (project_id, role_code)
  where to_date is null;

create index if not exists project_role_slot_project_idx on public.project_role_slot (project_id);
create index if not exists project_role_slot_user_idx on public.project_role_slot (user_id);

create table if not exists public.role_fallback (
  role_code text not null references public.role (code),
  fallback_role_code text not null references public.role (code),
  priority int not null default 1,
  primary key (role_code, fallback_role_code)
);

comment on table public.role_fallback is
  'Łańcuch fallbacku (/docs/04 §2.2). Rezolwer w kodzie musi mieć limit głębokości (np. 5) — '
  'ta tabela NIE ma zabezpieczenia przed cyklem na poziomie bazy, celowo (właściciel: "wystarczy '
  'limit głębokości w kodzie, nie trzeba constraintu"). Patrz lib/process/role-fallback.ts.';

insert into public.role_fallback (role_code, fallback_role_code, priority) values
  ('opiekun_projektu', 'wlasciciel', 1),
  ('koordynator_operacyjny', 'opiekun_projektu', 1),
  ('projektant', 'koordynator_techniczny', 1),
  ('lider_montazu', 'koordynator_techniczny', 1),
  ('asystent_procesu', 'opiekun_projektu', 1)
on conflict (role_code, fallback_role_code) do nothing;

-- wdrozeniowiec: brak fallbacku, celowo (/docs/04 §2.2) — musi być obsadzony przed Etapem 6.

alter table public.role enable row level security;
alter table public.project_role_slot enable row level security;
alter table public.role_fallback enable row level security;

drop policy if exists "role_all" on public.role;
create policy "role_all" on public.role for all using (true) with check (true);

drop policy if exists "project_role_slot_all" on public.project_role_slot;
create policy "project_role_slot_all" on public.project_role_slot for all using (true) with check (true);

drop policy if exists "role_fallback_all" on public.role_fallback;
create policy "role_fallback_all" on public.role_fallback for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Domknięcie FK z fazy 1: process_stage_role_responsibility.role_code było wolnym
-- tekstem, bo słownik role jeszcze nie istniał. Teraz istnieje — dociągamy constraint.
-- ---------------------------------------------------------------------------

alter table public.process_stage_role_responsibility
  add constraint process_stage_role_responsibility_role_fk
    foreign key (role_code) references public.role (code);

-- ---------------------------------------------------------------------------
-- Reguła autor != zatwierdzający (/docs/04 §2.3) — tabela + kolumna-zaczep.
-- ŚWIADOMA GRANICA ZAKRESU: mechanizm gotowy, NIEWPIĘTY w żaden przepływ UI.
-- process_items.kind (checklist/protocol/settlement/kanban/note) nie rozróżnia
-- podtypów artefaktu — bez artifact_type nie ma czego przekazać do walidatora.
-- Wpięcie zależy od otagowania konkretnych trzech artefaktów przy definiowaniu
-- ich szablonów (poza zakresem tej fazy). Patrz /docs/08 D16.
-- ---------------------------------------------------------------------------

alter table public.process_items
  add column if not exists artifact_type text;

comment on column public.process_items.artifact_type is
  'Opcjonalny podtyp artefaktu, luźno powiązany z artifact_second_signature_requirement.artifact_type '
  '(bez twardego FK — większość elementów procesu nie ma podtypu). Otaguj przy definiowaniu szablonu, '
  'jeśli element odpowiada jednemu z trzech artefaktów z /docs/04 §2.3.';

create table if not exists public.artifact_second_signature_requirement (
  id uuid primary key default gen_random_uuid(),
  artifact_type text not null unique,
  required_role_codes text[] not null,
  description text not null default ''
);

comment on table public.artifact_second_signature_requirement is
  'Artefakty wymagające drugiego podpisu, gdy autor i zatwierdzający to ta sama osoba (/docs/04 §2.3). '
  'NIEWPIĘTA w żaden przepływ — patrz komentarz przy process_items.artifact_type i /docs/08 D16.';

insert into public.artifact_second_signature_requirement (artifact_type, required_role_codes, description) values
  ('uwagi_prefabrykacji_do_dokumentacji', array['wdrozeniowiec'], 'Uwagi z prefabrykacji do dokumentacji (Etap 6)'),
  ('odbior_wewnetrzny_montazu_etap8', array['wdrozeniowiec'], 'Odbiór wewnętrzny montażu (Etap 8)'),
  ('rozstrzygniecie_niejasnosci_etap7', array['wlasciciel', 'wdrozeniowiec'], 'Rozstrzygnięcie niejasności z listy online (Etap 7)')
on conflict (artifact_type) do nothing;

alter table public.artifact_second_signature_requirement enable row level security;
drop policy if exists "artifact_second_signature_requirement_all" on public.artifact_second_signature_requirement;
create policy "artifact_second_signature_requirement_all" on public.artifact_second_signature_requirement
  for all using (true) with check (true);
