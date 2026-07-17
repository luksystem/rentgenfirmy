-- Wyniki przeglądu względem kryteriów są konfigurowalne w ustawieniach modułu celów
-- (app_settings.goals_module_settings.reviewOutcomes) — zdejmujemy sztywny CHECK.

alter table public.goal_reviews
  drop constraint if exists goal_reviews_outcome_check;

alter table public.goal_review_meeting_items
  drop constraint if exists goal_review_meeting_items_outcome_check;
