-- Powiadomienia o zbliżającym się końcu gwarancji

alter table public.user_notifications
  drop constraint if exists user_notifications_kind_check;

alter table public.user_notifications
  add constraint user_notifications_kind_check
  check (kind in ('kanban_mention', 'kanban_new_activity', 'warranty_expiring'));
