-- Powiadomienia o ustaleniach utworzonych przez klienta

alter table public.user_notifications
  drop constraint if exists user_notifications_kind_check;

alter table public.user_notifications
  add constraint user_notifications_kind_check
  check (kind in ('kanban_mention', 'kanban_new_activity', 'warranty_expiring', 'agreement_client_created'));
