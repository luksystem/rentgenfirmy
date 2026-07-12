-- Powiadomienia modułu Moja praca → Zadania

alter table public.user_notifications drop constraint if exists user_notifications_kind_check;
alter table public.user_notifications add constraint user_notifications_kind_check
  check (kind in (
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
    'work_item_verification_needed'
  ));
