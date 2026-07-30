-- Rejestracja nowego rodzaju powiadomienia: odpowiedzialny za etap dostaje push + wpis w
-- dzwonku, gdy pracownik wysle zdjecie do klienta (element procesu "Zdjecie do klienta").
--
-- Przy okazji: migracja 271 przebudowala ta liste i przy tym ZGUBILA 'requisition_order_overdue'
-- (dodane w 181, obecne w lib/notifications/types.ts, ale nie w constraint od 271) - przywracam
-- ja tutaj razem z nowym rodzajem, zeby nie pogłębiać regresji skoro i tak przebudowuje ten CHECK.

alter table user_notifications drop constraint user_notifications_kind_check;
alter table user_notifications add constraint user_notifications_kind_check check (
  kind = any (array[
    'kanban_mention','kanban_new_activity','warranty_expiring','agreement_client_created',
    'client_stage_rating','service_intake_preliminary_offer','service_intake_assigned',
    'inspection_billing_due','goal_review_due','goal_period_ending','goal_at_risk',
    'goal_recurring_created','leave_request_created','leave_request_decided',
    'monthly_review_self_submitted','client_offer_accepted','settlement_offer_accepted',
    'client_offer_expiring','work_item_assigned','work_item_sent','work_item_changed',
    'work_item_acceptance_needed','work_item_obstacle_reported','work_item_overdue',
    'work_item_verification_needed','work_item_takeover_requested','change_request_client_responded',
    'offer_approval_requested','offer_approval_reviewed','agreement_client_responded',
    'service_intake_submitted','service_intake_status','chat_mention','chat_message',
    'chat_room_invite','commitment_window_warning','commitment_unavailable_warning',
    'leave_commitment_impact',
    'employee_report_classified','employee_report_accepted','employee_report_completed',
    'employee_report_closed','employee_report_urgent',
    'requisition_order_overdue',
    'process_snapshot_uploaded'
  ])
);
