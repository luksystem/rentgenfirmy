-- Etap 3: rozszerzenie katalogu źródeł work_items + assignee na zadaniach funkcjonalności

insert into public.work_item_source_types (code, label, module_label, icon, sort_order) values
  ('process_item',        'Checklista / protokół',   'Proces projektu',  'list-checks',     30),
  ('service_intake',      'Zgłoszenie serwisowe',    'Serwis',           'inbox',           40),
  ('project_agreement',   'Ustalenie projektu',      'Ustalenia',        'clipboard-check', 50),
  ('inspection',          'Przegląd serwisowy',      'Przeglądy',        'clipboard-list',  60),
  ('resource_plan_item',  'Pozycja planu zasobów',   'Plan Zasobów',     'calendar-range',  70),
  ('functionality_task',  'Zadanie funkcjonalności', 'Ankieta klienta',  'clipboard-pen',   80)
on conflict (code) do nothing;

alter table public.project_functionality_tasks
  add column if not exists assignee_id uuid references public.profiles (id) on delete set null;

create index if not exists project_functionality_tasks_assignee_idx
  on public.project_functionality_tasks (assignee_id)
  where assignee_id is not null;

-- Powiadomienie: prośba o przejęcie zadania
alter table public.user_notifications drop constraint if exists user_notifications_kind_check;

alter table public.user_notifications
  add constraint user_notifications_kind_check check (
    kind in (
      'kanban_mention',
      'kanban_new_activity',
      'warranty_expiring',
      'agreement_client_created',
      'client_stage_rating',
      'service_intake_preliminary_offer',
      'inspection_billing_due',
      'goal_review_due',
      'goal_period_ending',
      'goal_at_risk',
      'goal_recurring_created',
      'leave_request_created',
      'leave_request_decided',
      'client_offer_accepted',
      'settlement_offer_accepted',
      'work_item_assigned',
      'work_item_sent',
      'work_item_changed',
      'work_item_acceptance_needed',
      'work_item_obstacle_reported',
      'work_item_overdue',
      'work_item_verification_needed',
      'work_item_takeover_requested'
    )
  );
