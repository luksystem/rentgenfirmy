-- Akceptacja wewnętrzna przed wysyłką wyceny/rozliczenia do klienta + flaga pomijania akceptacji.

alter table public.services
  add column if not exists estimate_approval_status text
    check (estimate_approval_status in ('pending', 'approved', 'question')),
  add column if not exists estimate_approval_requested_by uuid references public.profiles (id) on delete set null,
  add column if not exists estimate_approval_assigned_admin_id uuid references public.profiles (id) on delete set null,
  add column if not exists estimate_approval_note text not null default '',
  add column if not exists estimate_approval_history jsonb not null default '[]'::jsonb,
  add column if not exists settlement_approval_status text
    check (settlement_approval_status in ('pending', 'approved', 'question')),
  add column if not exists settlement_approval_requested_by uuid references public.profiles (id) on delete set null,
  add column if not exists settlement_approval_assigned_admin_id uuid references public.profiles (id) on delete set null,
  add column if not exists settlement_approval_note text not null default '',
  add column if not exists settlement_approval_history jsonb not null default '[]'::jsonb;

comment on column public.services.estimate_approval_status is
  'Stan wewnętrznej akceptacji wyceny przed wysyłką do klienta: pending (czeka na admina), approved (może wysłać wnioskodawca), question (admin ma pytanie). Null = brak aktywnego cyklu akceptacji.';
comment on column public.services.settlement_approval_status is
  'Jak estimate_approval_status, dla rozliczenia powykonawczego.';

alter table public.profiles
  add column if not exists offer_approval_bypass boolean not null default false;

comment on column public.profiles.offer_approval_bypass is
  'Gdy true: użytkownik może wysyłać wyceny/rozliczenia do klienta bez akceptacji administratora (np. zastępstwo podczas urlopu admina). Administratorzy zawsze pomijają akceptację niezależnie od tej flagi.';

-- Rozszerzenie katalogu kind o nowe powiadomienia akceptacji ofert. Przy okazji uzupełniamy
-- 'monthly_review_self_submitted', który został dodany w typach TS (lib/notifications/types.ts)
-- w migracji 171_monthly_reviews.sql bez odpowiadającej aktualizacji tego check constraint.
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
      'offer_approval_reviewed'
    )
  );
