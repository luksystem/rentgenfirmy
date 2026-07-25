-- Feedback pracownika przy zamykaniu elementu planu ("Zakończone") — wejście do cotygodniowych
-- podsumowań wysyłanych klientom (patrz lib/resource-plan/distribution.ts).
alter table public.resource_plan_items
  add column if not exists completion_feedback text not null default '';

comment on column public.resource_plan_items.completion_feedback is
  'Krótki feedback pracownika po zakończeniu elementu — trafia do podsumowania wysyłanego klientowi.';
