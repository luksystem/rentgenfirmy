-- Etap rozliczenia przeglądów + powiadomienia dla osoby odpowiedzialnej

alter table public.inspections
  drop constraint if exists inspections_status_check;

alter table public.inspections
  add constraint inspections_status_check
  check (
    status in ('quoting', 'preliminary', 'planned', 'completed', 'billing', 'settled')
  );

alter table public.inspections
  add column if not exists billing_settled_at timestamptz,
  add column if not exists billing_notification_sent_at timestamptz;

alter table public.user_notifications
  drop constraint if exists user_notifications_kind_check;

alter table public.user_notifications
  add constraint user_notifications_kind_check
  check (
    kind in (
      'kanban_mention',
      'kanban_new_activity',
      'warranty_expiring',
      'agreement_client_created',
      'client_stage_rating',
      'service_intake_preliminary_offer',
      'inspection_billing_due'
    )
  );
