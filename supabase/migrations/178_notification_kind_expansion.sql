-- Rozszerzenie katalogu kind o powiadomienia dodane wraz z realnym push/e-mail/SMS
-- dla pelnej tabeli routingu powiadomien (agreement_client_responded — nowe powiadomienie
-- zespolu po odpowiedzi klienta na ustalenie; service_intake_submitted/service_intake_status —
-- push do zespolu obok istniejacego e-maila do klienta).
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
      'service_intake_assigned',
      'inspection_billing_due',
      'goal_review_due',
      'goal_period_ending',
      'goal_at_risk',
      'goal_recurring_created',
      'leave_request_created',
      'leave_request_decided',
      'monthly_review_self_submitted',
      'client_offer_accepted',
      'settlement_offer_accepted',
      'client_offer_expiring',
      'work_item_assigned',
      'work_item_sent',
      'work_item_changed',
      'work_item_acceptance_needed',
      'work_item_obstacle_reported',
      'work_item_overdue',
      'work_item_verification_needed',
      'work_item_takeover_requested',
      'change_request_client_responded',
      'offer_approval_requested',
      'offer_approval_reviewed',
      'agreement_client_responded',
      'service_intake_submitted',
      'service_intake_status'
    )
  );

-- Sprzatanie: dawny, osobny checkbox "SMS o urlopach" zostal scalony z glowna tabela
-- powiadomien (lib/leave/leave-sms.ts czyta teraz email_settings.routing). Wartosc
-- przenosi (jednorazowo, przed ta migracja) scripts/migrate-leave-sms-setting.ts.
delete from public.app_settings where id = 'leave_notifications_settings';
