-- Zaakceptowane urlopy (leave_requests) mają teraz zasilać silnik podpowiedzi
-- przydziału w Planie Zasobów (lib/resource-plan/suggestions.ts), który sprawdza
-- user_absences, żeby nie podsuwać do zadania osoby będącej na urlopie.
-- Link 1:1 do wniosku — pozwala idempotentnie upsert/usuwać wpis przy decyzji/cofnięciu,
-- a `on delete cascade` czyści wpis automatycznie, gdy wniosek zostanie usunięty.

alter table public.user_absences
  add column if not exists leave_request_id uuid references public.leave_requests (id) on delete cascade;

-- Zwykły (nie częściowy) unique index — Postgres traktuje wiele NULL-i jako odrębne,
-- więc nie kolidują wpisy nieobecności niepowiązane z wnioskiem urlopowym. Musi być
-- "pełny" (bez WHERE), bo Supabase upsert(onConflict:) wymaga arbitra bez predykatu.
create unique index if not exists user_absences_leave_request_idx
  on public.user_absences (leave_request_id);
