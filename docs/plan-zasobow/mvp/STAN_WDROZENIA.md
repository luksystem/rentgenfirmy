# Stan wdrożenia — Plan Zasobów

> Odniesienie do pierwotnego planu 8 etapów. Etapy 1–4 są **zaimplementowane, zalintowane i
> wypchnięte na `main`** (commity `ae3847b`, `ca408a8`). Etap 5 zaimplementowany częściowo
> (silnik walidacji gotowy i zintegrowany z panelem edycji). Etapy 6–8 nie rozpoczęte.

## Etap 1 — Fundament danych (słowniki) ✅ Zrobione

- Migracja `098_resource_plan_dictionaries.sql`: tabela `resource_dictionary_items` (10 słowników:
  role operacyjne, kompetencje, poziomy kompetencji, zespoły, obszary, typy pracy, statusy planu,
  poziomy ryzyka, typy nieobecności, typy budżetów) + funkcja `has_full_app_access()` + seed
  demonstracyjny.
- Backend: `lib/resource-plan/dictionary-types.ts`, `lib/supabase/dictionary-repository.ts`,
  `store/dictionary-store.ts`.
- UI: `components/settings/dictionary-settings-page.tsx` (generyczny edytor z zakładkami per
  słownik, sortowanie strzałkami, edycja nazwy/opisu/koloru/ikony/aktywności) +
  `app/ustawienia/plan-zasobow/page.tsx` + link z `/ustawienia`.

## Etap 2 — Rozszerzenie użytkownika ✅ Zrobione

- Migracja `099_resource_plan_user_extensions.sql`: `profiles` + limity godzin, lokalizacja
  bazowa, stawka kosztowa (opcjonalna), dostępność do planowania; nowe tabele
  `user_operational_roles`, `user_competencies`, `user_teams`, `user_certificates`,
  `user_absences`.
- Backend: `lib/resource-plan/user-resource-types.ts`, `lib/supabase/user-resource-repository.ts`
  (w tym `fetchUserResourceProfilesBatch` — batch, bez N+1), `store/user-resource-store.ts`.
- Rozszerzono `lib/auth/types.ts` (`UserProfile`, `UserProfileInput`) i
  `lib/supabase/profile-mappers.ts` o nowe pola profilu.
- UI: `components/admin/user-resource-profile-editor.tsx`, zintegrowany w
  `components/admin/user-admin-panel.tsx` (role, kompetencje z poziomem, zespoły, certyfikaty,
  nieobecności — chipy + formularze dodawania/usuwania).
- API: `app/api/admin/users/route.ts` i `app/api/admin/users/[id]/route.ts` parsują i zapisują
  nowe pola profilu.

## Etap 3 — Rozszerzenie procesu i etapów ✅ Zrobione

- Migracja `100_resource_plan_process_stage_extensions.sql`: `process_stages` + min/optymalna
  liczba osób, szacowany czas trwania i roboczogodziny, domyślne budżety, domyślne ryzyko, flagi
  (równoległość, wymagany lider, dozwolony uczeń); nowe tabele
  `process_stage_role_requirements`, `process_stage_competency_requirements`,
  `process_stage_dependencies`.
- Typy: `lib/process/types.ts` (`ProcessStage` rozszerzony — pola **opcjonalne**, by nie łamać
  istniejących generatorów szablonów w `template-factory.ts`/`default-templates.ts`).
- Mapowanie: `lib/supabase/process-mappers.ts` (`rowToProcessStage`) i
  `lib/process/anchored-template.ts` (`parseProcessTemplateSnapshot`) — obie ścieżki (z bazy i
  z zamrożonego JSONB snapshotu) uzupełniają domyślne wartości identycznie.
- Repo: `lib/supabase/process-repository.ts` — `fetchTemplatesGraph` dociąga wymagania batchowo;
  `insertTemplateStagesGraph` wstawia w dwóch fazach (najpierw etapy, potem wymagania i
  zależności), by uniknąć FK violation przy zależnościach „w przód”.
- UI: `components/process/process-stage-resource-panel.tsx`, zintegrowany w
  `components/process/process-template-editor.tsx` (rozwijany panel pod tytułem etapu).

## Etap 4 — Moduł Plan Zasobów, MVP ✅ Zrobione (wariant: lista, nie Gantt)

- Migracja `101_resource_plan_items.sql`: `resource_plan_items` + `resource_plan_item_participants`.
- Backend: `lib/resource-plan/types.ts`, `lib/supabase/resource-plan-repository.ts`
  (CRUD + `fetchResourcePlanItemsInRange`/`fetchResourcePlanItemsForProject`),
  `store/resource-plan-store.ts` (cache po zakresie dat, `ensureRange`).
- UI: `components/resource-plan/resource-plan-list.tsx` (nawigacja miesiąc wstecz/w przód,
  lista elementów planu z kolorami/ikonami statusu i ryzyka, projekt/klient/osoba
  odpowiedzialna) + `components/resource-plan/resource-plan-side-panel.tsx` (pełnoekranowy
  dialog tworzenia/edycji: projekt → etap procesu z auto-podpowiedzią wymagań, daty, godziny,
  osoba odpowiedzialna + uczestnicy, zespół, status, ryzyko, 3 typy budżetu, notatki).
- Nawigacja: wpis „Plan Zasobów” w grupie „Projekty” (`components/app-shell.tsx`),
  strona `app/plan-zasobow/page.tsx`.

**Uwaga / odstępstwo od oryginalnego planu:** zbudowano widok **listy**, nie Gantt/RTM.
Gantt/kalendarz/dashboard to osobne widoki tego samego modułu (Etapy 6 i rozszerzenie Etapu 4) —
zaplanowane, nie zaimplementowane (patrz „Do zrobienia” poniżej). Uzasadnienie: w aplikacji nie
istniała żadna biblioteka Gantt/kalendarza ani wzorzec drag&drop poza natywnym HTML5 w Kanbanie
(potwierdzone analizą — patrz `docs/plan-zasobow/mvp/ARCHITEKTURA.md` §7 D7/D8) — lista +
panel boczny to najszybsza ścieżka do w pełni działającego, przetestowalnego MVP, na którym
osadzi się kolejne widoki bez zmian w warstwie danych.

## Etap 5 — Walidacje ⚠️ Częściowo zrobione

- ✅ Silnik `lib/resource-plan/validations.ts` (`validateResourcePlanItem`) — 10 reguł
  ostrzegawczych (konflikt osoby/zespołu, przekroczenie limitu godzin dziennych/tygodniowych,
  brak roli/kompetencji/lidera wymaganych przez etap, brak przypisanej osoby, nachodzenie na
  nieobecność, brak budżetu, wysokie ryzyko).
- ✅ Zintegrowany z panelem edycji (`resource-plan-side-panel.tsx`) — ostrzeżenia widoczne w
  czasie rzeczywistym, checkbox `accepted_risk` wymagany do zapisu przy aktywnych ostrzeżeniach.
- ❌ Brak: prezentacji ostrzeżeń **poza** panelem edycji (np. plakietka na karcie w widoku listy/
  Gantt, osobny widok „Konflikty i ryzyka”).
- ❌ Brak: reguły „brak lidera” nie uwzględnia jeszcze `allowsTrainee` (dopuszczenie ucznia bez
  wymaganej kompetencji) — do doprecyzowania przy pracach nad sugestiami (Etap 7).

## Etap 6 — Dashboard modułu ❌ Nie zaczęte

Zakres z oryginalnego planu: obciążenie firmy/zespołu/osoby, liczba konfliktów, zadania
zagrożone, wolna zdolność, nieprzypisane projekty/zadania, planowany budżet robocizny.

**Rekomendowany start:** nowy plik `lib/supabase/resource-plan-history-repository.ts` (wzorem
`goal-history-repository.ts` z modułu Celów) z zapytaniami agregującymi po `assignee_id`/
`team_item_id`/`status_item_id` w zadanym oknie czasowym; strona `/plan-zasobow/dashboard` z
kartami KPI (Recharts — już w projekcie) + tabelą „nieprzypisane” (elementy planu bez
`assignee_id` i bez uczestników).

## Etap 7 — Sugestie regułowe (bez AI) ❌ Nie zaczęte

Zakres: dopasowanie po roli/kompetencji, poziomie kompetencji, dostępności, obciążeniu, braku
konfliktów; prezentacja % dopasowania, brakujących kompetencji, najbliższej dostępności, ryzyk.

**Rekomendowany start:** funkcja czysta `lib/resource-plan/suggestions.ts` (podobna sygnatura do
`validateResourcePlanItem`, ale zwraca rankingowaną listę kandydatów z `profilesById`,
`resourceProfilesById`, wymaganiami etapu i istniejącymi elementami planu do liczenia
obciążenia/konfliktów) — reużywa tych samych danych, które już ładuje panel boczny.

## Etap 8 — Przygotowanie pod AI ❌ Nie zaczęte

Zakres: architektura pod przyszły Recommendation Engine / Capacity Planner / analizę nowych
zleceń / sugerowane terminy i zespoły / analizę wpływu.

**Rekomendowany start:** dopiero po Etapie 7 — silnik regułowy to naturalny „fallback” i punkt
odniesienia (ground truth) dla przyszłych sugestii AI, analogicznie do wzorca
`lib/audit/*` (silnik regułowy + osobna warstwa AI) i modułu Celów (`lib/ai/goal-methodology-advisor.ts`).

## Braki i dług techniczny do domknięcia przy kolejnych etapach

- Widoki Gantt/RTM, kalendarz i dashboard modułu (Etap 4 rozszerzenie + Etap 6) — obecnie tylko
  lista.
- Brak API route'ów `app/api/plan-zasobow/**` — obecnie repo/store wołane wprost z klienta
  (Supabase RLS chroni zapis). Do rozważenia przy potrzebie logiki serwerowej (np. webhooki,
  generowanie sugestii AI po stronie serwera).
- Brak testów automatycznych dla `validateResourcePlanItem` — zalecane przed rozbudową o kolejne
  reguły (Etap 7 bazuje na tym samym module).
- Kolizja numeracji migracji z równoległą pracą nad modułem „Tablica Celów”
  (`098_goals_mvp.sql`, `099_goal_methodologies_seed.sql` używają tych samych numerów co
  `098_resource_plan_dictionaries.sql`/`099_resource_plan_user_extensions.sql`, mimo różnych
  nazw plików) — do przenumerowania przy commitowaniu tamtego modułu (patrz jego dokumentacja).
