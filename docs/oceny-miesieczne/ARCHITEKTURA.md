# Oceny miesięczne — architektura

Comiesięczny cykl: pracownik ocenia sam siebie, jego przełożony (dowolny manager/
administrator) ocenia go niezależnie i "na ślepo" (bez wglądu w samoocenę przed
złożeniem własnej oceny), a AI zestawia obie perspektywy w raport z rekomendacją.
Administrator na tej podstawie zapisuje decyzję (status + opcjonalna kwota + notatka)
— to zalążek przyszłego modułu rozliczania pensji/premii, nie pełny system płacowy.

## Model danych (`supabase/migrations/171_monthly_reviews.sql`)

- `profiles.monthly_review_enabled` — czy dana osoba uczestniczy w cyklu (domyślnie
  `true`, `false` dla ról `administrator`). Edytowalne per użytkownik w
  `components/admin/user-admin-panel.tsx`.
- `monthly_reviews` — rodzic, jeden wiersz na pracownika × miesiąc
  (`unique(employee_id, period_month)`), znaczniki `self_submitted_at` /
  `manager_submitted_at` / `manager_id`, status `ai_status`.
- `monthly_self_assessments` — ocena (1–10) + komentarz + `hours_context_snapshot`
  (zrzut godzin z momentu wysyłki). Jednorazowa (unique employee+miesiąc).
- `monthly_manager_assessments` — jak wyżej, plus `manager_id`. Jednorazowa — reset
  tylko przez administratora (`resetManagerAssessmentServer`, usuwa wiersz).
- `monthly_review_ai_reports` — `report` (jsonb: `summary`, `agreements`,
  `discrepancies`, `risks`, `recommendation`), `status`/`source` (`ai`|`rules`),
  `shared_with_employee_at` — null dopóki administrator świadomie nie udostępni
  raportu pracownikowi (przycisk w panelu admina, nie ustawienie globalne).
- `monthly_review_decisions` — `status` (enum `monthly_review_decision_status`),
  opcjonalna `amount`, `note`, `decided_by`/`decided_at`.

RLS: wszystkie 5 tabel bez polityk insert/update/delete (zapisy wyłącznie przez API na
`getSupabaseAdmin()` — service role), select ograniczony wg roli (funkcja
`public.is_manager_or_admin()` wzorem `public.is_administrator()`). Widoczność surowej
oceny managera dla pracownika (ustawienie w `/ustawienia/oceny-miesieczne`) i
widoczność raportu AI (`shared_with_employee_at`) są egzekwowane w warstwie API
(maskowanie odpowiedzi w `fetchCombinedReviewServer`), nie w RLS — analogicznie do
`leave-requests?scope=planning`.

## Warstwy kodu

- `lib/monthly-reviews/` — typy, `permissions.ts` (`canRateEmployee` =
  `hasFullAppAccess`, `canDecideCompensation` = `isAdministratorRole`),
  `reconciliation-provider.ts` (fallback regułowy bez AI), `settings.ts` (toggle
  widoczności oceny managera w `app_settings`), `format.ts` (etykieta miesiąca).
- `lib/ai/monthly-review-ai.ts` — `generateMonthlyReviewReconciliation()`, wzorem
  `lib/ai/my-work-ai.ts` (ten sam `callOpenAiJson()`, fallback przy braku
  `OPENAI_API_KEY` lub błędzie).
- `lib/supabase/monthly-review-server.ts` — ensure/submit/fetch dla samooceny i oceny
  managera, `ensureMonthlyReviewAiReportServer()` (uruchamia AI dopiero gdy obie oceny
  złożone), `fetchCombinedReviewServer()` (widok pracownika z maskowaniem),
  `fetchTeamReviewQueueServer()` (kolejka managera — bez treści samooceny).
- `lib/supabase/monthly-review-admin-server.ts` — listing/detal dla admina, zapis
  decyzji, udostępnienie raportu, reset oceny managera.
- `lib/supabase/monthly-review-settings-server.ts` — ustawienia w `app_settings`
  (anon-klient, tabela ma otwarte RLS — wzorem `project-activity-settings-server.ts`).
- `lib/supabase/monthly-review-repository.ts` — cienkie `fetch()` wrappery dla UI.

## Trasy

- `/moja-praca/oceny` — samoocena pracownika (tylko bieżący miesiąc, bez wyboru
  zaległych). Nowy klucz nawigacyjny `my-work-reviews`.
- `/pracownicy/oceny-miesieczne` — kolejka + ocena managera. **Żyje pod istniejącym
  modułem "employees"** (bez własnego klucza nawigacyjnego) — ponieważ ten moduł jest
  domyślnie dostępny też dla `instalator`/`office`, każda route API i strona
  niezależnie sprawdzają `hasFullAppAccess(profile.role)`.
- `/admin/oceny-miesieczne` (+ `/[reviewId]`) — panel admina: obie oceny, raport AI,
  akcje "Udostępnij pracownikowi" / "Cofnij ocenę managera", formularz decyzji.
  Middleware chroni `/admin/*` globalnie, bez wpisu w macierzy uprawnień.
- `/ustawienia/oceny-miesieczne` — toggle widoczności oceny managera dla pracownika.

## Ograniczenia wersji 1

- Tylko bieżący miesiąc — brak wyboru/uzupełniania zaległych miesięcy.
- Brak faktycznego modułu płacowego — `monthly_review_decisions` to prosty,
  rozszerzalny rekord (status + kwota + notatka), nie integracja z płacami.
- "Ślepy" tryb managera (brak wglądu w samoocenę przed złożeniem własnej oceny) jest
  gwarancją na poziomie UI/API, nie twardej reguły RLS — manager/admin technicznie
  mógłby odczytać `monthly_self_assessments` bezpośrednio przez REST przed złożeniem
  swojej oceny.

## Wdrożenie

Migracja `171_monthly_reviews.sql` wymaga ręcznego uruchomienia w Supabase SQL Editor
(konwencja tego projektu — brak podpiętego Supabase CLI). Bez niej endpointy
`/api/monthly-reviews/*` i `/api/admin/monthly-reviews/*` zwrócą błąd bazy danych.
